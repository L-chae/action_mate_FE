// src/features/my/api/myApi.local.ts
import meetingApiLocalDefault from "@/features/meetings/api/meetingApi.local";
import { useAuthStore } from "@/features/auth/model/authStore";
import type { MeetingPost, MembershipStatus } from "@/features/meetings/model/types";
import type { MyMeetingItem, MyProfile, MySummary } from "../model/types";

type MeetingApiLocalModule = typeof meetingApiLocalDefault & {
  __getMockDataUnsafe?: () => MeetingPost[];
};

// ----------------------------------------------------------------------
// 1) Helpers & Mappers
// ----------------------------------------------------------------------

const mapJoinStatus = (status?: MembershipStatus): "MEMBER" | "PENDING" | undefined => {
  if (status === "MEMBER") return "MEMBER";
  if (status === "PENDING") return "PENDING";
  return undefined;
};

const toMyItem = (m: MeetingPost): MyMeetingItem => {
  const meetingTime = typeof m.meetingTime === "string" ? m.meetingTime : "";
  const dateText = meetingTime.includes("T") ? meetingTime.split("T")[0] : meetingTime;

  return {
    id: String(m.id),
    title: m.title?.trim() ? m.title : "(제목 없음)",
    location: { name: m.location?.name?.trim() ? m.location.name : "장소 미정" },
    dateText: m.meetingTimeText ?? dateText,
    memberCount: Number((m.capacity as any)?.current ?? 0) || 0,
    myJoinStatus: mapJoinStatus(m.myState?.membershipStatus),
  };
};

const applyPatchToPost = (origin: MeetingPost, patch: Partial<MyMeetingItem>): MeetingPost => {
  return {
    ...origin,
    title: patch.title ?? origin.title,
    location: {
      ...(origin.location as any),
      name: patch.location?.name ?? origin.location?.name,
    } as any,
  };
};

// ----------------------------------------------------------------------
// 2) Logic Helpers
// ----------------------------------------------------------------------

const getCurrentUserId = () => {
  const user = useAuthStore.getState().user;
  // 백엔드/프론트에서 "loginId === id"처럼 동작하는 경우가 많아서 loginId 우선
  return user ? String((user as any).loginId ?? user.id) : "guest";
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
      id: user ? String((user as any).id ?? "guest") : "guest",
      nickname: user?.nickname?.trim() ? user.nickname : "액션메이트",
      avatarUrl: user?.avatarUrl ?? null,
    };
  },

  async updateProfile(payload: MyProfile): Promise<MyProfile> {
    // 서버가 없으므로 store만 갱신 (실제 화면 즉시 반영용)
    await useAuthStore.getState().updateProfile({
      nickname: payload.nickname,
      avatarUrl: payload.avatarUrl ?? null,
    });
    return payload;
  },

  async getSummary(): Promise<MySummary> {
    // ✅ MySummary = UserReputation(avgRate/orgTime) 기준
    return {
      avgRate: 4.6,
      orgTime: 12,
    };
  },

  async getHostedMeetings(): Promise<MyMeetingItem[]> {
    const db = getMeetingsDB();
    const myId = getCurrentUserId();

    const hosted = db.filter((m) => {
      const hostId = m.host?.id;
      return String(hostId) === myId || m.myState?.membershipStatus === "HOST";
    });

    return hosted.map(toMyItem);
  },

  async getJoinedMeetings(): Promise<MyMeetingItem[]> {
    const db = getMeetingsDB();

    const joined = db.filter(
      (m) => m.myState?.membershipStatus === "MEMBER" || m.myState?.membershipStatus === "PENDING",
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
    const idx = db.findIndex((m) => String(m.id) === String(id));
    if (idx === -1) throw new Error("모임을 찾을 수 없습니다.");

    db[idx] = applyPatchToPost(db[idx], patch);
    return toMyItem(db[idx]);
  },

  async deleteHostedMeeting(id: string): Promise<void> {
    const db = getMeetingsDB();
    const idx = db.findIndex((m) => String(m.id) === String(id));
    if (idx !== -1) db.splice(idx, 1);
  },
};

export default myApiLocal;