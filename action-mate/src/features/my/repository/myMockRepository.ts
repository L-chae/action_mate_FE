// src/features/my/repository/myMockRepository.ts
import type { MyRepository } from "./MyRepository";
import type { MyProfile, MySummary, MyMeetingItem } from "../types";
import type { MeetingPost } from "@/features/meetings/model/meeting.types";

import { HOST_USERS } from "@/features/meetings/mocks/meetingMockData";
import { __getMockDataUnsafe } from "@/features/meetings/api/meetingService"; // ✅ 핵심: 같은 DB 사용

import {
  toMyMeetingItemFromMeetingPost,
  applyMyMeetingPatchToMeetingPost,
} from "./my.mapper";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function calcTemperatureFromPraise(praiseCount: number) {
  const base = 36.5;
  const t = base + praiseCount * 0.12;
  return clamp(Number(t.toFixed(1)), 32, 42);
}

const ME_ID = "me";

// ✅ meetings 도메인의 단일 mock DB(_DATA)를 그대로 사용
function getMeetingsDB(): MeetingPost[] {
  return __getMockDataUnsafe();
}

let dbProfile: MyProfile = {
  nickname: HOST_USERS.me?.nickname ?? "액션메이트",
  photoUrl: HOST_USERS.me?.avatarUrl,
};

let dbPraiseCount = HOST_USERS.me?.kudosCount ?? 0;

function hostedPosts(db: MeetingPost[]) {
  return db.filter((m) => m.host?.id === ME_ID);
}

function joinedPosts(db: MeetingPost[]) {
  const st = (m: any) => m?.myState?.membershipStatus;
  return db.filter((m) => st(m) === "MEMBER" || st(m) === "PENDING");
}

function findHostedIndexOrThrow(db: MeetingPost[], id: string) {
  const idx = db.findIndex((m) => String(m.id) === String(id) && m.host?.id === ME_ID);
  if (idx < 0) throw new Error("해당 모임을 찾을 수 없어요.");
  return idx;
}

export const myMockRepository: MyRepository = {
  async getProfile() {
    return dbProfile;
  },

  async updateProfile(payload) {
    dbProfile = { ...dbProfile, ...payload };
    return dbProfile;
  },

  async getSummary() {
    const temperature = calcTemperatureFromPraise(dbPraiseCount);
    return { praiseCount: dbPraiseCount, temperature } as MySummary;
  },

  async getHostedMeetings() {
    const db = getMeetingsDB();
    return hostedPosts(db).map(toMyMeetingItemFromMeetingPost);
  },

  async getJoinedMeetings() {
    const db = getMeetingsDB();
    const list = joinedPosts(db).map(toMyMeetingItemFromMeetingPost);

    // ✅ PENDING 먼저
    return list.sort(
      (a, b) =>
        (a.myJoinStatus === "PENDING" ? -1 : 0) -
        (b.myJoinStatus === "PENDING" ? -1 : 0)
    );
  },

  async updateHostedMeeting(id: string, patch: Partial<MyMeetingItem>) {
    const db = getMeetingsDB();
    const idx = findHostedIndexOrThrow(db, id);

    // id 변경 방지
    const { id: _ignore, ...safePatch } = patch;

    // ✅ meetingService의 _DATA를 직접 수정
    db[idx] = applyMyMeetingPatchToMeetingPost(db[idx], safePatch);
    return toMyMeetingItemFromMeetingPost(db[idx]);
  },

  async deleteHostedMeeting(id: string) {
    const db = getMeetingsDB();
    const idx = findHostedIndexOrThrow(db, id);

    // ✅ meetingService의 _DATA에서 제거
    db.splice(idx, 1);
  },
};
