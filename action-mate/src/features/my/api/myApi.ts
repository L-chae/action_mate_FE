import { HOST_USERS } from "@/features/meetings/mocks/meetingMockData";
import { __getMockDataUnsafe } from "@/features/meetings/api/meetingApi.local";
import type { MeetingPost } from "@/features/meetings/model/types";
import type { MyMeetingItem, MyProfile, MySummary } from "../model/types";
import { toMyMeetingItemFromMeetingPost, applyMyMeetingPatchToMeetingPost } from "./my.mapper";

// ----------------------------------------------------------------------
// 1. Helpers & Mock Logic
// ----------------------------------------------------------------------

const ME_ID = "me";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function calcTemperatureFromPraise(praiseCount: number) {
  const base = 36.5;
  const t = base + praiseCount * 0.12;
  return clamp(Number(t.toFixed(1)), 32, 42);
}

function getMeetingsDB(): MeetingPost[] {
  return __getMockDataUnsafe();
}

let dbProfile: MyProfile = {
  nickname: HOST_USERS.me?.nickname ?? "액션메이트",
  photoUrl: HOST_USERS.me?.avatarUrl,
};

let dbPraiseCount = HOST_USERS.me?.kudosCount ?? 0;

function hostedPosts(db: MeetingPost[]) {
  return db.filter((m) => String((m as any)?.host?.id ?? "") === ME_ID);
}

function joinedPosts(db: MeetingPost[]) {
  const st = (m: MeetingPost) => (m as any)?.myState?.membershipStatus;
  return db.filter((m) => st(m) === "MEMBER" || st(m) === "PENDING");
}

function findHostedIndexOrThrow(db: MeetingPost[], id: string) {
  const idx = db.findIndex((m) => String(m.id) === String(id) && String((m as any)?.host?.id ?? "") === ME_ID);
  if (idx < 0) throw new Error("해당 모임을 찾을 수 없어요.");
  return idx;
}

// ----------------------------------------------------------------------
// 2. Mock API
// ----------------------------------------------------------------------

const mockApi = {
  async getProfile(): Promise<MyProfile> {
    return dbProfile;
  },

  async updateProfile(payload: MyProfile): Promise<MyProfile> {
    // 의도: 마이페이지에서 편집한 프로필을 mock 상태로 유지
    dbProfile = { ...dbProfile, ...payload };
    return dbProfile;
  },

  async getSummary(): Promise<MySummary> {
    const temperature = calcTemperatureFromPraise(dbPraiseCount);
    return { praiseCount: dbPraiseCount, temperature };
  },

  async getHostedMeetings(): Promise<MyMeetingItem[]> {
    const db = getMeetingsDB();
    return hostedPosts(db).map(toMyMeetingItemFromMeetingPost);
  },

  async getJoinedMeetings(): Promise<MyMeetingItem[]> {
    const db = getMeetingsDB();
    const list = joinedPosts(db).map(toMyMeetingItemFromMeetingPost);

    // ✅ PENDING을 상단으로 안정적으로 정렬
    return list.sort((a, b) => {
      const ap = a.myJoinStatus === "PENDING" ? 0 : 1;
      const bp = b.myJoinStatus === "PENDING" ? 0 : 1;
      return ap - bp;
    });
  },

  async updateHostedMeeting(id: string, patch: Partial<MyMeetingItem>): Promise<MyMeetingItem> {
    const db = getMeetingsDB();
    const idx = findHostedIndexOrThrow(db, id);

    // id 변경 방지
    const { id: _ignore, ...safePatch } = patch;

    // ✅ 원본 meetings DB를 직접 수정 -> 홈/디테일에도 즉시 반영
    db[idx] = applyMyMeetingPatchToMeetingPost(db[idx], safePatch);
    return toMyMeetingItemFromMeetingPost(db[idx]);
  },

  async deleteHostedMeeting(id: string): Promise<void> {
    const db = getMeetingsDB();
    const idx = findHostedIndexOrThrow(db, id);
    db.splice(idx, 1);
  },
};

// ----------------------------------------------------------------------
// 3. Remote API (Placeholder)
// ----------------------------------------------------------------------

const remoteApi = {
  async getProfile(): Promise<MyProfile> {
    throw new Error("Not implemented yet");
  },
  async updateProfile(_payload: MyProfile): Promise<MyProfile> {
    throw new Error("Not implemented yet");
  },
  async getSummary(): Promise<MySummary> {
    throw new Error("Not implemented yet");
  },
  async getHostedMeetings(): Promise<MyMeetingItem[]> {
    throw new Error("Not implemented yet");
  },
  async getJoinedMeetings(): Promise<MyMeetingItem[]> {
    throw new Error("Not implemented yet");
  },
  async updateHostedMeeting(_id: string, _patch: Partial<MyMeetingItem>): Promise<MyMeetingItem> {
    throw new Error("Not implemented yet");
  },
  async deleteHostedMeeting(_id: string): Promise<void> {
    throw new Error("Not implemented yet");
  },
};

// ----------------------------------------------------------------------
// 4. Export (Switching Logic)
// ----------------------------------------------------------------------

const USE_MOCK = true;
export const myApi = USE_MOCK ? mockApi : remoteApi;
