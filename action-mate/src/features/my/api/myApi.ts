import { HOST_USERS } from "@/features/meetings/mocks/meetingMockData";
import { __getMockDataUnsafe } from "@/features/meetings/api/meetingApi.local";
import type { MeetingPost } from "@/features/meetings/model/types";
import type { MyMeetingItem, MyProfile, MySummary } from "../model/types";
import {
  toMyMeetingItemFromMeetingPost,
  applyMyMeetingPatchToMeetingPost,
} from "./my.mapper"; 

// ----------------------------------------------------------------------
// 1. Helpers & Mock Logic (기존 myMockRepository 내용)
// ----------------------------------------------------------------------

const ME_ID = "me";

// 헬퍼: 값 범위 제한
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

// 헬퍼: 칭찬 횟수로 온도 계산
function calcTemperatureFromPraise(praiseCount: number) {
  const base = 36.5;
  const t = base + praiseCount * 0.12;
  return clamp(Number(t.toFixed(1)), 32, 42);
}

// 헬퍼: Meetings 도메인의 Mock DB 참조 (데이터 동기화를 위해 중요)
function getMeetingsDB(): MeetingPost[] {
  return __getMockDataUnsafe();
}

// Mock State: 내 프로필 및 칭찬 카운트
let dbProfile: MyProfile = {
  nickname: HOST_USERS.me?.nickname ?? "액션메이트",
  photoUrl: HOST_USERS.me?.avatarUrl,
};

let dbPraiseCount = HOST_USERS.me?.kudosCount ?? 0;

// 쿼리 헬퍼: 내가 주최한 모임
function hostedPosts(db: MeetingPost[]) {
  return db.filter((m) => m.host?.id === ME_ID);
}

// 쿼리 헬퍼: 내가 참여한 모임 (MEMBER or PENDING)
function joinedPosts(db: MeetingPost[]) {
  const st = (m: MeetingPost) => m.myState?.membershipStatus;
  return db.filter((m) => st(m) === "MEMBER" || st(m) === "PENDING");
}

// 쿼리 헬퍼: 주최한 모임 인덱스 찾기
function findHostedIndexOrThrow(db: MeetingPost[], id: string) {
  const idx = db.findIndex(
    (m) => String(m.id) === String(id) && m.host?.id === ME_ID
  );
  if (idx < 0) throw new Error("해당 모임을 찾을 수 없어요.");
  return idx;
}

// ----------------------------------------------------------------------
// 2. Mock API Implementation
// ----------------------------------------------------------------------

const mockApi = {
  async getProfile(): Promise<MyProfile> {
    return dbProfile;
  },

  async updateProfile(payload: MyProfile): Promise<MyProfile> {
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

    // 정렬: 승인 대기(PENDING)를 상단으로
    return list.sort(
      (a, b) =>
        (a.myJoinStatus === "PENDING" ? -1 : 0) -
        (b.myJoinStatus === "PENDING" ? -1 : 0)
    );
  },

  async updateHostedMeeting(
    id: string,
    patch: Partial<MyMeetingItem>
  ): Promise<MyMeetingItem> {
    const db = getMeetingsDB();
    const idx = findHostedIndexOrThrow(db, id);

    // id 변경 방지
    const { id: _ignore, ...safePatch } = patch;

    // ✅ 원본 DB(_DATA)를 직접 수정 -> 홈 화면 등에도 즉시 반영됨
    db[idx] = applyMyMeetingPatchToMeetingPost(db[idx], safePatch);
    return toMyMeetingItemFromMeetingPost(db[idx]);
  },

  async deleteHostedMeeting(id: string): Promise<void> {
    const db = getMeetingsDB();
    const idx = findHostedIndexOrThrow(db, id);

    // ✅ 원본 DB(_DATA)에서 삭제 -> 홈 화면에서도 사라짐
    db.splice(idx, 1);
  },
};

// ----------------------------------------------------------------------
// 3. Remote API Implementation (Placeholder)
// ----------------------------------------------------------------------

// 나중에 서버 API가 준비되면 이곳을 채우면 됩니다.
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
  async updateHostedMeeting(
    id: string,
    patch: Partial<MyMeetingItem>
  ): Promise<MyMeetingItem> {
    throw new Error("Not implemented yet");
  },
  async deleteHostedMeeting(id: string): Promise<void> {
    throw new Error("Not implemented yet");
  },
};

// ----------------------------------------------------------------------
// 4. Export (Switching Logic)
// ----------------------------------------------------------------------

// 환경 변수나 설정에 따라 Mock/Remote 전환
const USE_MOCK = true; // __DEV__ 등을 사용할 수도 있음

// 외부에서는 이 myApi 객체만 사용하면 됨
export const myApi = USE_MOCK ? mockApi : remoteApi;