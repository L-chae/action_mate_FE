// src/features/my/repository/myMockRepository.ts
import type { MyRepository } from "./MyRepository";
import type { MyProfile, MySummary, MyMeetingItem } from "../types";
import type { MeetingPost } from "@/features/meetings/types";
import { HOST_USERS, MOCK_MEETINGS_SEED } from "@/features/meetings/meetingMockData";
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

// ✅ seed 복제 후 이 배열만 mutate
let dbMeetings: MeetingPost[] = MOCK_MEETINGS_SEED.map((m) => ({ ...m }));

let dbProfile: MyProfile = {
  nickname: HOST_USERS.me?.nickname ?? "액션메이트",
  photoUrl: HOST_USERS.me?.avatarUrl,
};

let dbPraiseCount = HOST_USERS.me?.kudosCount ?? 0;

function hostedPosts() {
  return dbMeetings.filter((m) => m.host?.id === ME_ID);
}

function joinedPosts() {
  const st = (m: any) => m?.myState?.membershipStatus;
  return dbMeetings.filter(
    (m) => st(m) === "MEMBER" || st(m) === "PENDING"
  );
}

function findHostedIndexOrThrow(id: string) {
  const idx = dbMeetings.findIndex((m) => m.id === id && m.host?.id === ME_ID);
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
    // mock은 “칭찬 기반 온도” 규칙 유지
    const temperature = calcTemperatureFromPraise(dbPraiseCount);

    return {
      praiseCount: dbPraiseCount,
      temperature,
    } as MySummary;
  },

  async getHostedMeetings() {
    return hostedPosts().map(toMyMeetingItemFromMeetingPost);
  },

  async getJoinedMeetings() {
    const list = joinedPosts().map(toMyMeetingItemFromMeetingPost);
    return list.sort((a, b) => (a.myJoinStatus === "PENDING" ? -1 : 0) - (b.myJoinStatus === "PENDING" ? -1 : 0));
  },

  async updateHostedMeeting(id: string, patch: Partial<MyMeetingItem>) {
    const idx = findHostedIndexOrThrow(id);

    // id 변경 방지
    const { id: _ignore, ...safePatch } = patch;

    dbMeetings[idx] = applyMyMeetingPatchToMeetingPost(dbMeetings[idx], safePatch);
    return toMyMeetingItemFromMeetingPost(dbMeetings[idx]);
  },

  async deleteHostedMeeting(id: string) {
    findHostedIndexOrThrow(id);
    dbMeetings = dbMeetings.filter((m) => !(m.id === id && m.host?.id === ME_ID));
  },
};
