// src/features/my/api/myApi.local.ts
import meetingApiLocalDefault from "@/features/meetings/api/meetingApi.local";
import { useAuthStore } from "@/features/auth/model/authStore";
import type { MeetingPost, MembershipStatus } from "@/features/meetings/model/types";
import type { MyMeetingItem, MyProfile, MySummary } from "../model/types";

type MeetingApiLocalModule = typeof meetingApiLocalDefault & {
  __getMockDataUnsafe?: () => MeetingPost[];
};

// ----------------------------------------------------------------------
// 1) Helpers
// ----------------------------------------------------------------------

const mapJoinStatus = (status?: MembershipStatus): "MEMBER" | "PENDING" | undefined => {
  if (status === "MEMBER") return "MEMBER";
  if (status === "PENDING") return "PENDING";
  return undefined;
};

const toMyItem = (m: MeetingPost): MyMeetingItem => {
  const meetingTime = typeof m?.meetingTime === "string" ? m.meetingTime : "";
  const fallbackDate = meetingTime.includes("T") ? meetingTime.split("T")[0] ?? "" : meetingTime;

  const title = typeof m?.title === "string" && m.title.trim() ? m.title : "(제목 없음)";
  const locationName =
    typeof m?.location?.name === "string" && m.location.name.trim() ? m.location.name : "장소 미정";

  const currentCountRaw = (m?.capacity as any)?.current;
  const memberCount =
    typeof currentCountRaw === "number" && Number.isFinite(currentCountRaw)
      ? Math.max(0, Math.trunc(currentCountRaw))
      : typeof currentCountRaw === "string" && currentCountRaw.trim() !== ""
        ? Math.max(0, Math.trunc(Number(currentCountRaw) || 0))
        : 0;

  return {
    id: String(m?.id ?? "unknown_post"),
    title,
    locationName,
    dateText: typeof m?.meetingTimeText === "string" && m.meetingTimeText.trim() ? m.meetingTimeText : fallbackDate,
    memberCount,
    myJoinStatus: mapJoinStatus(m?.myState?.membershipStatus),
  };
};

const applyPatchToPost = (origin: MeetingPost, patch: Partial<MyMeetingItem>): MeetingPost => {
  const nextTitle = typeof patch?.title === "string" ? patch.title : undefined;
  const nextLocationName = typeof patch?.locationName === "string" ? patch.locationName : undefined;

  return {
    ...origin,
    title: nextTitle ?? origin.title,
    location: {
      ...(origin.location as any),
      name: nextLocationName ?? origin.location?.name,
    } as any,
  };
};

// ----------------------------------------------------------------------
// 2) Logic Helpers
// ----------------------------------------------------------------------

const getCurrentUserId = () => {
  const user = useAuthStore.getState().user;
  return user ? String((user as any)?.loginId ?? user?.id ?? "guest") : "guest";
};

function getMeetingsDB(): MeetingPost[] {
  const mod = meetingApiLocalDefault as MeetingApiLocalModule;
  return mod.__getMockDataUnsafe?.() ?? [];
}

// ----------------------------------------------------------------------
// 3) Local(My Mock) API
// ----------------------------------------------------------------------

export const myApiLocal = {
  async getProfile(): Promise<MyProfile> {
    const user = useAuthStore.getState().user;

    return {
      id: user ? String((user as any)?.id ?? "guest") : "guest",
      nickname: typeof user?.nickname === "string" && user.nickname.trim() ? user.nickname : "액션메이트",
      avatarUrl: user?.avatarUrl ?? null,
      avatarImageName: (user as any)?.avatarImageName ?? null,
    };
  },

  async updateProfile(payload: MyProfile): Promise<MyProfile> {
    await useAuthStore.getState().updateProfile({
      nickname: payload?.nickname,
      avatarUrl: payload?.avatarUrl ?? null,
      avatarImageName: payload?.avatarImageName ?? null,
    });
    return payload;
  },

  async getSummary(): Promise<MySummary> {
    return {
      avgRate: 4.6,
      orgTime: 12,
    };
  },

  async getHostedMeetings(): Promise<MyMeetingItem[]> {
    const db = getMeetingsDB();
    const myId = getCurrentUserId();

    const hosted = db.filter((m) => {
      const hostId = (m as any)?.host?.id;
      return String(hostId ?? "") === myId || (m as any)?.myState?.membershipStatus === "HOST";
    });

    return hosted.map(toMyItem);
  },

  async getJoinedMeetings(): Promise<MyMeetingItem[]> {
    const db = getMeetingsDB();

    const joined = db.filter(
      (m) => (m as any)?.myState?.membershipStatus === "MEMBER" || (m as any)?.myState?.membershipStatus === "PENDING"
    );

    return joined
      .map(toMyItem)
      .sort((a, b) => {
        const scoreA = a.myJoinStatus === "PENDING" ? 0 : 1;
        const scoreB = b.myJoinStatus === "PENDING" ? 0 : 1;
        return scoreA - scoreB;
      });
  },

  async updateHostedMeeting(id: string, patch: Partial<MyMeetingItem>): Promise<MyMeetingItem> {
    const db = getMeetingsDB();
    const idx = db.findIndex((m) => String(m?.id ?? "") === String(id));
    if (idx === -1) throw new Error("모임을 찾을 수 없습니다.");

    db[idx] = applyPatchToPost(db[idx], patch);
    return toMyItem(db[idx]);
  },

  async deleteHostedMeeting(id: string): Promise<void> {
    const db = getMeetingsDB();
    const idx = db.findIndex((m) => String(m?.id ?? "") === String(id));
    if (idx !== -1) db.splice(idx, 1);
  },
};

export default myApiLocal;

/**
 * 3줄 요약
 * - MyMeetingItem을 locationName(string) 기반으로 맞추고, mock MeetingPost에서도 안전하게 변환합니다.
 * - MyProfile은 UserSummary 형태(avatarUrl/avatarImageName)로 반환/업데이트하도록 통일했습니다.
 * - 누락/타입 흔들림은 기본값 처리로 UI가 깨지지 않게 방어했습니다.
 */