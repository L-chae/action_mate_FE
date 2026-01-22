// src/features/my/api/myApi.ts (가정)
import { HOST_USERS } from "@/features/meetings/mocks/meetingMockData";
import { __getMockDataUnsafe } from "@/features/meetings/api/meetingApi.local";
import type { MeetingPost } from "@/features/meetings/model/types";
import { useAuthStore } from "@/features/auth/model/authStore"; // ✅ AuthStore 추가
import type { MyMeetingItem, MyProfile, MySummary } from "../model/types";
import { toMyMeetingItemFromMeetingPost, applyMyMeetingPatchToMeetingPost } from "./my.mapper";

// ----------------------------------------------------------------------
// 1. Helpers & Mock Logic
// ----------------------------------------------------------------------

// ✅ 더 이상 고정된 "me"가 아닙니다. 현재 로그인한 유저의 ID를 가져옵니다.
const getCurrentUserId = () => {
  const user = useAuthStore.getState().user;
  return user ? user.id : "guest"; // 로그인이 안되어있으면 guest
};

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

// 초기값 (fallback용)
let mockLocalProfile: MyProfile = {
  nickname: "액션메이트",
  photoUrl: undefined,
};

let dbPraiseCount = HOST_USERS.me?.kudosCount ?? 0;

// ✅ 내가 주최한 모임 필터링 (현재 ID 기준)
function hostedPosts(db: MeetingPost[]) {
  const myId = getCurrentUserId();
  // host.id가 내 ID와 같은지 비교
  return db.filter((m) => String((m as any)?.host?.id ?? "") === String(myId));
}

// ✅ 내가 참여한 모임 필터링 (로직 유지, 필요 시 ID 체크 추가 가능)
function joinedPosts(db: MeetingPost[]) {
  const st = (m: MeetingPost) => (m as any)?.myState?.membershipStatus;
  return db.filter((m) => st(m) === "MEMBER" || st(m) === "PENDING");
}

function findHostedIndexOrThrow(db: MeetingPost[], id: string) {
  const myId = getCurrentUserId();
  const idx = db.findIndex((m) => String(m.id) === String(id) && String((m as any)?.host?.id ?? "") === String(myId));
  if (idx < 0) throw new Error("해당 모임을 찾을 수 없어요. (본인 모임이 아니거나 삭제됨)");
  return idx;
}

// ----------------------------------------------------------------------
// 2. Mock API
// ----------------------------------------------------------------------

const mockApi = {
  async getProfile(): Promise<MyProfile> {
    // ✅ Store에 있는 최신 유저 정보를 우선 사용 (Kakao 연동 정보)
    const user = useAuthStore.getState().user;
    if (user) {
      return {
        nickname: user.nickname,
        photoUrl: user.avatar ?? mockLocalProfile.photoUrl, // avatar 필드명 확인 필요 (types.ts에 avatar로 되어있음)
      };
    }
    return mockLocalProfile;
  },

  async updateProfile(payload: MyProfile): Promise<MyProfile> {
    // Mock 환경에서 프로필 업데이트 시 로컬 변수 업데이트
    mockLocalProfile = { ...mockLocalProfile, ...payload };
    
    // AuthStore에도 반영 (UI 즉시 갱신을 위해)
    const user = useAuthStore.getState().user;
    if (user) {
        useAuthStore.getState().updateProfile({ 
            nickname: payload.nickname, 
            avatar: payload.photoUrl // User 타입에 맞게 매핑
        });
    }

    return mockLocalProfile;
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

// 테스트를 위해 강제로 Mock 사용
const USE_MOCK = true;
export const myApi = USE_MOCK ? mockApi : remoteApi;