import type { MyRepository } from "./MyRepository";
import type { MyProfile, MySummary, MyMeetingItem } from "../model/types";
import type { MeetingPost } from "@/features/meetings/model/types";

// ✅ Mock 데이터 위치 확인 (mocks 폴더가 없다면 경로를 맞춰주세요)
import { HOST_USERS } from "@/features/meetings/mocks/meetingMockData";

// ✅ [수정] meetingService 삭제됨 -> meetingApi.local에서 가져옴
import { __getMockDataUnsafe } from "@/features/meetings/api/meetingApi.local";

import {
  toMyMeetingItemFromMeetingPost,
  applyMyMeetingPatchToMeetingPost,
} from "./my.mapper";

// --- Helpers ---
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function calcTemperatureFromPraise(praiseCount: number) {
  const base = 36.5;
  const t = base + praiseCount * 0.12;
  return clamp(Number(t.toFixed(1)), 32, 42);
}

const ME_ID = "me";

// ✅ meetings 도메인의 Local Mock DB(_DATA)를 그대로 참조 (Reference)
function getMeetingsDB(): MeetingPost[] {
  return __getMockDataUnsafe();
}

let dbProfile: MyProfile = {
  nickname: HOST_USERS.me?.nickname ?? "액션메이트",
  photoUrl: HOST_USERS.me?.avatarUrl,
};

let dbPraiseCount = HOST_USERS.me?.kudosCount ?? 0;

// --- Query Helpers ---
function hostedPosts(db: MeetingPost[]) {
  return db.filter((m) => m.host?.id === ME_ID);
}

function joinedPosts(db: MeetingPost[]) {
  // myState?.membershipStatus가 MEMBER 혹은 PENDING인 것
  const st = (m: MeetingPost) => m.myState?.membershipStatus;
  return db.filter((m) => st(m) === "MEMBER" || st(m) === "PENDING");
}

function findHostedIndexOrThrow(db: MeetingPost[], id: string) {
  const idx = db.findIndex((m) => String(m.id) === String(id) && m.host?.id === ME_ID);
  if (idx < 0) throw new Error("해당 모임을 찾을 수 없어요.");
  return idx;
}

// ✅ Repository Implementation
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

    // 정렬: 승인 대기(PENDING)를 상단으로
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

    // ✅ 원본 DB(_DATA)를 직접 수정 -> 홈 화면 등에도 즉시 반영됨
    db[idx] = applyMyMeetingPatchToMeetingPost(db[idx], safePatch);
    return toMyMeetingItemFromMeetingPost(db[idx]);
  },

  async deleteHostedMeeting(id: string) {
    const db = getMeetingsDB();
    const idx = findHostedIndexOrThrow(db, id);

    // ✅ 원본 DB(_DATA)에서 삭제 -> 홈 화면에서도 사라짐
    db.splice(idx, 1);
  },
};