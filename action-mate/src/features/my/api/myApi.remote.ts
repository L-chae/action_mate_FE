// src/features/my/api/myApi.remote.ts
import { client } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/api/endpoints";
import { useAuthStore } from "@/features/auth/model/authStore";

import type { ApiUserProfileResponse, Post as ApiPost, PostUpdateRequest } from "@/shared/api/schemas";
import type { MyMeetingItem, MyProfile, MySummary } from "../model/types";
import {
  mapApiPostToMyMeetingItem,
  mapPostToMyMeetingItem,
  mapUserProfileResponseToMyProfile,
  mapUserProfileToMySummary,
} from "../model/mappers";
import { mapApiPostToPost, mapApiUserProfileToUserProfile } from "@/shared/model/mappers";
import { API_BASE_URL } from "@/shared/api/apiClient";

type MaybeArray<T> = T | T[];

function ensureArray<T>(v: MaybeArray<T> | null | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function getCurrentUserIdOrThrow(): string {
  const user = useAuthStore.getState().user;
  const id = user ? String((user as any)?.loginId ?? user?.id ?? "") : "";
  if (!id.trim()) throw new Error("로그인이 필요합니다.");
  return id.trim();
}

const toFiniteNumberOrUndefined = (v: unknown): number | undefined => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

export const myApiRemote = {
  async getProfile(): Promise<MyProfile> {
    const userId = getCurrentUserIdOrThrow();
    const res = await client.get<ApiUserProfileResponse>(endpoints.users.profile(userId));
    return mapUserProfileResponseToMyProfile(res.data, { apiBaseUrl: API_BASE_URL });
  },

  async updateProfile(payload: MyProfile): Promise<MyProfile> {
    // ✅ OpenAPI에 프로필 수정 엔드포인트가 없음 → UI 즉시 반영만 수행
    await useAuthStore.getState().updateProfile({
      nickname: payload?.nickname,
      avatarUrl: payload?.avatarUrl ?? null,
      avatarImageName: payload?.avatarImageName ?? null,
    });
    return payload;
  },

  async getSummary(): Promise<MySummary> {
    const userId = getCurrentUserIdOrThrow();
    const res = await client.get<ApiUserProfileResponse>(endpoints.users.profile(userId));

    // shared mapper로 표준화 후 요약 추출(정책 통일)
    const profile = mapApiUserProfileToUserProfile(res.data, { apiBaseUrl: API_BASE_URL });
    return mapUserProfileToMySummary(profile);
  },

  async getHostedMeetings(): Promise<MyMeetingItem[]> {
    const myId = getCurrentUserIdOrThrow();

    const res = await client.get<ApiPost[] | ApiPost>(endpoints.posts.list);
    const raws = ensureArray(res.data);

    // ✅ Raw → UI Post로 1차 표준화 후 필터링(서버 흔들림 흡수)
    const uiPosts = raws.map((p) => mapApiPostToPost(p as any, { apiBaseUrl: API_BASE_URL }));

    const hosted = uiPosts.filter((p) => String(p?.writerId ?? "") === myId || p?.myParticipationStatus === "HOST");
    return hosted.map(mapPostToMyMeetingItem);
  },

  async getJoinedMeetings(): Promise<MyMeetingItem[]> {
    const res = await client.get<ApiPost[] | ApiPost>(endpoints.posts.list);
    const raws = ensureArray(res.data);

    const uiPosts = raws.map((p) => mapApiPostToPost(p as any, { apiBaseUrl: API_BASE_URL }));

    const joined = uiPosts.filter(
      (p) => p?.myParticipationStatus === "MEMBER" || p?.myParticipationStatus === "PENDING"
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
    // 현재 Post를 먼저 읽어 서버가 요구하는 필드를 최대한 보존
    const current = await client.get<ApiPost>(endpoints.posts.byId(id));
    const cur = current.data;

    const nextTitle = typeof patch?.title === "string" && patch.title.trim() ? patch.title : cur?.title;
    const nextLocationName =
      typeof patch?.locationName === "string" && patch.locationName.trim() ? patch.locationName : cur?.locationName;

    const body: PostUpdateRequest = {
      title: nextTitle ?? undefined,
      locationName: nextLocationName ?? undefined,
      latitude: toFiniteNumberOrUndefined(cur?.latitude),
      longitude: toFiniteNumberOrUndefined(cur?.longitude),
      // 서버가 joinMode/state 등을 요구하는 경우가 있어, 가능한 한 현 상태를 유지 (없으면 미전송)
      joinMode: (cur as any)?.joinMode ?? undefined,
      category: (cur as any)?.category ?? undefined,
      content: (cur as any)?.content ?? undefined,
      meetingTime: (cur as any)?.meetingTime ?? undefined,
      capacity: typeof (cur as any)?.capacity === "number" ? (cur as any).capacity : undefined,
      state: (cur as any)?.state ?? undefined,
    };

    // undefined 제거(서버 입력값 검증이 엄격할 때 방어)
    const cleaned = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)) as PostUpdateRequest;

    const res = await client.put<ApiPost>(endpoints.posts.byId(id), cleaned);

    // ApiPost -> MyMeetingItem (표준화 포함)
    return mapApiPostToMyMeetingItem(res.data, { apiBaseUrl: API_BASE_URL });
  },

  async deleteHostedMeeting(id: string): Promise<void> {
    await client.delete(endpoints.posts.byId(id));
  },
};

export default myApiRemote;

/**
 * 3줄 요약
 * - 프로필/요약은 OpenAPI(/users/{userId}/profile) 응답(ApiUserProfileResponse)을 shared mapper로 표준화해 사용합니다.
 * - 모임 목록은 ApiPost → UI Post로 먼저 통일한 뒤 필터링/매핑해 서버 흔들림에도 UI가 안정적으로 동작합니다.
 * - 모임 수정은 현재 값을 최대한 보존해 PostUpdateRequest를 구성하고, undefined는 제거해 서버 검증에 대비했습니다.
 */