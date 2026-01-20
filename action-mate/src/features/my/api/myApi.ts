// src/features/my/api/myApi.ts (최종본)
// ✅ getSummary: 칭찬 기반 온도 계산 제거
// ✅ meetingApi.local.ts의 __getUserTempUnsafe("me")로 온도 가져오기

import { HOST_USERS } from "@/features/meetings/mocks/meetingMockData";
import { __getMockDataUnsafe, __getUserTempUnsafe } from "@/features/meetings/api/meetingApi.local";
import type { MeetingPost } from "@/features/meetings/model/types";
import type { MyMeetingItem, MyProfile, MySummary } from "../model/types";
import { toMyMeetingItemFromMeetingPost, applyMyMeetingPatchToMeetingPost } from "./my.mapper";

const ME_ID = "me";

// Meetings 도메인의 Mock DB 참조
function getMeetingsDB(): MeetingPost[] {
  return __getMockDataUnsafe();
}

// Mock State: 내 프로필 및 칭찬 카운트(유지 가능)
let dbProfile: MyProfile = {
  nickname: HOST_USERS.me?.nickname ?? "액션메이트",
  photoUrl: HOST_USERS.me?.avatarUrl,
};

// 칭찬은 그대로 유지(원하면 나중에 평가 기반으로도 바꿀 수 있음)
let dbPraiseCount = HOST_USERS.me?.kudosCount ?? 0;

// 쿼리: 내가 주최한 모임
function hostedPosts(db: MeetingPost[]) {
  return db.filter((m) => m.host?.id === ME_ID);
}

// 쿼리: 내가 참여한 모임
function joinedPosts(db: MeetingPost[]) {
  const st = (m: MeetingPost) => m.myState?.membershipStatus;
  return db.filter((m) => st(m) === "MEMBER" || st(m) === "PENDING");
}

function findHostedIndexOrThrow(db: MeetingPost[], id: string) {
  const idx = db.findIndex((m) => String(m.id) === String(id) && m.host?.id === ME_ID);
  if (idx < 0) throw new Error("해당 모임을 찾을 수 없어요.");
  return idx;
}

const mockApi = {
  async getProfile(): Promise<MyProfile> {
    return dbProfile;
  },

  async updateProfile(payload: MyProfile): Promise<MyProfile> {
    dbProfile = { ...dbProfile, ...payload };
    return dbProfile;
  },

  // ✅ 여기만 핵심 변경!
  async getSummary(): Promise<MySummary> {
    const temperature = __getUserTempUnsafe(ME_ID); // ✅ 평가 누적 반영된 온도
    return { praiseCount: dbPraiseCount, temperature };
  },

  async getHostedMeetings(): Promise<MyMeetingItem[]> {
    const db = getMeetingsDB();
    return hostedPosts(db).map(toMyMeetingItemFromMeetingPost);
  },

  async getJoinedMeetings(): Promise<MyMeetingItem[]> {
    const db = getMeetingsDB();
    const list = joinedPosts(db).map(toMyMeetingItemFromMeetingPost);
    return list.sort(
      (a, b) =>
        (a.myJoinStatus === "PENDING" ? -1 : 0) - (b.myJoinStatus === "PENDING" ? -1 : 0)
    );
  },

  async updateHostedMeeting(id: string, patch: Partial<MyMeetingItem>): Promise<MyMeetingItem> {
    const db = getMeetingsDB();
    const idx = findHostedIndexOrThrow(db, id);

    const { id: _ignore, ...safePatch } = patch;
    db[idx] = applyMyMeetingPatchToMeetingPost(db[idx], safePatch);

    return toMyMeetingItemFromMeetingPost(db[idx]);
  },

  async deleteHostedMeeting(id: string): Promise<void> {
    const db = getMeetingsDB();
    const idx = findHostedIndexOrThrow(db, id);
    db.splice(idx, 1);
  },
};

// Remote는 그대로
const remoteApi = {
  async getProfile(): Promise<MyProfile> {
    throw new Error("Not implemented yet");
  },
  async updateProfile(payload: MyProfile): Promise<MyProfile> {
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
  async updateHostedMeeting(id: string, patch: Partial<MyMeetingItem>): Promise<MyMeetingItem> {
    throw new Error("Not implemented yet");
  },
  async deleteHostedMeeting(id: string): Promise<void> {
    throw new Error("Not implemented yet");
  },
};

const USE_MOCK = true;
export const myApi = USE_MOCK ? mockApi : remoteApi;
