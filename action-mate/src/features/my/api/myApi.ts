// src/features/my/api/myApi.ts
import meetingApiLocalDefault from "@/features/meetings/api/meetingApi";
import { useAuthStore } from "@/features/auth/model/authStore";
import { USE_MOCK_AUTH } from "@/features/auth/api/authApi";

import { client, API_BASE_URL } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/api/endpoints";
import type { ApiUserProfileResponse, Post as ApiPost, PostUpdateRequest } from "@/shared/api/schemas";
import { mapApiPostToPost, mapApiUserProfileToUserProfile } from "@/shared/model/mappers";

import type { MeetingPost, MembershipStatus } from "@/features/meetings/model/types";
import type { MyMeetingItem, MyProfile, MySummary } from "../model/types";
import {
  mapApiPostToMyMeetingItem,
  mapPostToMyMeetingItem,
  mapUserProfileResponseToMyProfile,
  mapUserProfileToMySummary,
} from "../model/mappers";

// -----------------------------------------------------------------------------
// Types / Helpers
// -----------------------------------------------------------------------------
type MaybeArray<T> = T | T[];

type MeetingApiLocalModule = typeof meetingApiLocalDefault & {
  __getMockDataUnsafe?: () => MeetingPost[];
};

function ensureArray<T>(v: MaybeArray<T> | null | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

const toFiniteNumberOrUndefined = (v: unknown): number | undefined => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

const mapJoinStatus = (status?: MembershipStatus): "MEMBER" | "PENDING" | undefined => {
  if (status === "MEMBER") return "MEMBER";
  if (status === "PENDING") return "PENDING";
  return undefined;
};

const toMyItem = (m: MeetingPost): MyMeetingItem => {
  const meetingTime = typeof (m as any)?.meetingTime === "string" ? (m as any).meetingTime : "";
  const fallbackDate = meetingTime.includes("T") ? meetingTime.split("T")[0] ?? "" : meetingTime;

  const title =
    typeof (m as any)?.title === "string" && String((m as any).title).trim() ? (m as any).title : "(제목 없음)";

  const locationName =
    typeof (m as any)?.location?.name === "string" && String((m as any).location.name).trim()
      ? (m as any).location.name
      : "장소 미정";

  const currentCountRaw = ((m as any)?.capacity as any)?.current;
  const memberCount =
    typeof currentCountRaw === "number" && Number.isFinite(currentCountRaw)
      ? Math.max(0, Math.trunc(currentCountRaw))
      : typeof currentCountRaw === "string" && currentCountRaw.trim() !== ""
        ? Math.max(0, Math.trunc(Number(currentCountRaw) || 0))
        : 0;

  return {
    id: String((m as any)?.id ?? "unknown_post"),
    title,
    locationName,
    dateText:
      typeof (m as any)?.meetingTimeText === "string" && String((m as any).meetingTimeText).trim()
        ? (m as any).meetingTimeText
        : fallbackDate,
    memberCount,
    myJoinStatus: mapJoinStatus((m as any)?.myState?.membershipStatus),
  };
};

const applyPatchToPost = (origin: MeetingPost, patch: Partial<MyMeetingItem>): MeetingPost => {
  const nextTitle = typeof patch?.title === "string" ? patch.title : undefined;
  const nextLocationName = typeof patch?.locationName === "string" ? patch.locationName : undefined;

  return {
    ...(origin as any),
    title: nextTitle ?? (origin as any).title,
    location: {
      ...(((origin as any).location ?? {}) as any),
      name: nextLocationName ?? (origin as any)?.location?.name,
    } as any,
  } as MeetingPost;
};

const getCurrentUserId = (): string => {
  const user = useAuthStore.getState().user;
  return user ? String((user as any)?.loginId ?? (user as any)?.id ?? "guest") : "guest";
};

function getCurrentUserIdOrThrow(): string {
  const user = useAuthStore.getState().user;
  const id = user ? String((user as any)?.loginId ?? (user as any)?.id ?? "") : "";
  if (!id.trim()) throw new Error("로그인이 필요합니다.");
  return id.trim();
}

function getMeetingsDB(): MeetingPost[] {
  const mod = meetingApiLocalDefault as MeetingApiLocalModule;
  return mod.__getMockDataUnsafe?.() ?? [];
}

// -----------------------------------------------------------------------------
// Single API (mock/remote 내부 분기)
// -----------------------------------------------------------------------------
export const myApi = {
  // ---------------------------------------------------------------------------
  // Profile
  // ---------------------------------------------------------------------------
  async getProfile(): Promise<MyProfile> {
    if (USE_MOCK_AUTH) {
      const user = useAuthStore.getState().user;

      return {
        id: user ? String((user as any)?.id ?? "guest") : "guest",
        nickname:
          typeof (user as any)?.nickname === "string" && String((user as any).nickname).trim()
            ? (user as any).nickname
            : "액션메이트",
        avatarUrl: (user as any)?.avatarUrl ?? null,
        avatarImageName: (user as any)?.avatarImageName ?? null,
      };
    }

    const userId = getCurrentUserIdOrThrow();
    const res = await client.get<ApiUserProfileResponse>(endpoints.users.profile(userId));
    return mapUserProfileResponseToMyProfile(res.data, { apiBaseUrl: API_BASE_URL });
  },

  async updateProfile(payload: MyProfile): Promise<MyProfile> {
    // ✅ OpenAPI에 프로필 수정 엔드포인트가 없음 → mock/remote 모두 UI 즉시 반영만 수행
    await useAuthStore.getState().updateProfile({
      nickname: payload?.nickname,
      avatarUrl: payload?.avatarUrl ?? null,
      avatarImageName: payload?.avatarImageName ?? null,
    });
    return payload;
  },

  async getSummary(): Promise<MySummary> {
    if (USE_MOCK_AUTH) {
      return { avgRate: 4.6, orgTime: 12 };
    }

    const userId = getCurrentUserIdOrThrow();
    const res = await client.get<ApiUserProfileResponse>(endpoints.users.profile(userId));

    const profile = mapApiUserProfileToUserProfile(res.data, { apiBaseUrl: API_BASE_URL });
    return mapUserProfileToMySummary(profile);
  },

  // ---------------------------------------------------------------------------
  // Meetings
  // ---------------------------------------------------------------------------
  async getHostedMeetings(): Promise<MyMeetingItem[]> {
    if (USE_MOCK_AUTH) {
      const db = getMeetingsDB();
      const myId = getCurrentUserId();

      const hosted = db.filter((m) => {
        const hostId = (m as any)?.host?.id;
        return String(hostId ?? "") === myId || (m as any)?.myState?.membershipStatus === "HOST";
      });

      return hosted.map(toMyItem);
    }

    const myId = getCurrentUserIdOrThrow();
    const res = await client.get<ApiPost[] | ApiPost>(endpoints.posts.list);
    const raws = ensureArray(res.data);

    const uiPosts = raws.map((p) => mapApiPostToPost(p as any, { apiBaseUrl: API_BASE_URL }));
    const hosted = uiPosts.filter(
      (p) => String((p as any)?.writerId ?? "") === myId || (p as any)?.myParticipationStatus === "HOST"
    );

    return hosted.map(mapPostToMyMeetingItem);
  },

  async getJoinedMeetings(): Promise<MyMeetingItem[]> {
    if (USE_MOCK_AUTH) {
      const db = getMeetingsDB();

      const joined = db.filter(
        (m) =>
          (m as any)?.myState?.membershipStatus === "MEMBER" || (m as any)?.myState?.membershipStatus === "PENDING"
      );

      return joined
        .map(toMyItem)
        .sort((a, b) => {
          const scoreA = a.myJoinStatus === "PENDING" ? 0 : 1;
          const scoreB = b.myJoinStatus === "PENDING" ? 0 : 1;
          return scoreA - scoreB;
        });
    }

    const res = await client.get<ApiPost[] | ApiPost>(endpoints.posts.list);
    const raws = ensureArray(res.data);

    const uiPosts = raws.map((p) => mapApiPostToPost(p as any, { apiBaseUrl: API_BASE_URL }));
    const joined = uiPosts.filter(
      (p) => (p as any)?.myParticipationStatus === "MEMBER" || (p as any)?.myParticipationStatus === "PENDING"
    );

    return joined
      .map(mapPostToMyMeetingItem)
      .sort((a, b) => {
        const scoreA = a.myJoinStatus === "PENDING" ? 0 : 1;
        const scoreB = b.myJoinStatus === "PENDING" ? 0 : 1;
        return scoreA - scoreB;
      });
  },

  async updateHostedMeeting(id: string, patch: Partial<MyMeetingItem>): Promise<MyMeetingItem> {
    const meetingId = String(id ?? "").trim();
    if (!meetingId) throw new Error("모임 ID가 필요합니다.");

    if (USE_MOCK_AUTH) {
      const db = getMeetingsDB();
      const idx = db.findIndex((m) => String((m as any)?.id ?? "") === meetingId);
      if (idx === -1) throw new Error("모임을 찾을 수 없습니다.");

      db[idx] = applyPatchToPost(db[idx], patch);
      return toMyItem(db[idx]);
    }

    const current = await client.get<ApiPost>(endpoints.posts.byId(meetingId));
    const cur = current.data;

    const nextTitle =
      typeof patch?.title === "string" && patch.title.trim() ? patch.title : ((cur as any)?.title as any);

    const nextLocationName =
      typeof patch?.locationName === "string" && patch.locationName.trim()
        ? patch.locationName
        : ((cur as any)?.locationName as any);

    const body: PostUpdateRequest = {
      title: nextTitle ?? undefined,
      locationName: nextLocationName ?? undefined,
      latitude: toFiniteNumberOrUndefined((cur as any)?.latitude),
      longitude: toFiniteNumberOrUndefined((cur as any)?.longitude),
      // 서버가 요구하는 필드가 있을 수 있어 가능한 값은 유지(없으면 미전송)
      joinMode: (cur as any)?.joinMode ?? undefined,
      category: (cur as any)?.category ?? undefined,
      content: (cur as any)?.content ?? undefined,
      meetingTime: (cur as any)?.meetingTime ?? undefined,
      capacity: typeof (cur as any)?.capacity === "number" ? (cur as any).capacity : undefined,
      state: (cur as any)?.state ?? undefined,
    };

    const cleaned = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)) as PostUpdateRequest;

    const res = await client.put<ApiPost>(endpoints.posts.byId(meetingId), cleaned);
    return mapApiPostToMyMeetingItem(res.data, { apiBaseUrl: API_BASE_URL });
  },

  async deleteHostedMeeting(id: string): Promise<void> {
    const meetingId = String(id ?? "").trim();
    if (!meetingId) return;

    if (USE_MOCK_AUTH) {
      const db = getMeetingsDB();
      const idx = db.findIndex((m) => String((m as any)?.id ?? "") === meetingId);
      if (idx !== -1) db.splice(idx, 1);
      return;
    }

    await client.delete(endpoints.posts.byId(meetingId));
  },
};

export default myApi;

// 3줄 요약
// - 오류 원인: meetingApiLocalDefault를 import하지 않아 TS가 식별자를 찾지 못했습니다.
// - 해결: meetingApi.local의 default export를 추가 import하고, __getMockDataUnsafe로 mock DB를 안전하게 조회합니다.
// - 주의: meetingApi.local.ts에서 default export에 __getMockDataUnsafe가 포함되어 있어야 합니다.
