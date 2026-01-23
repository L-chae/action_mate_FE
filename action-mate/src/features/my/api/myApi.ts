// src/features/my/api/myApi.mock.ts

import meetingApiLocal from "@/features/meetings/api/meetingApi.local"; 
import { useAuthStore } from "@/features/auth/model/authStore";
import type { MeetingPost, MembershipStatus } from "@/features/meetings/model/types";
import type { MyMeetingItem, MyProfile, MySummary } from "../model/types";

// ----------------------------------------------------------------------
// 1. Helpers & Mappers
// ----------------------------------------------------------------------

// MembershipStatus -> "MEMBER" | "PENDING" | undefined 변환
const mapJoinStatus = (status?: MembershipStatus): "MEMBER" | "PENDING" | undefined => {
  if (status === "MEMBER") return "MEMBER";
  if (status === "PENDING") return "PENDING";
  return undefined; 
};

// ✅ [수정] MeetingPost -> MyMeetingItem 변환
const toMyItem = (m: MeetingPost): MyMeetingItem => ({
  id: m.id,
  title: m.title,
  
  // 변경된 타입: place(string) -> location.name(object)
  location: { 
    name: m.location.name 
  },

  // 날짜 변환 (ISO String -> YYYY-MM-DD 단순화)
  dateText: m.meetingTime ? m.meetingTime.split("T")[0] : "",
  
  memberCount: m.capacity.current,
  myJoinStatus: mapJoinStatus(m.myState?.membershipStatus),
});

// ✅ [수정] MyMeetingItem 수정사항 -> MeetingPost 반영
// (Nested Object인 location 업데이트 로직 수정)
const applyPatchToPost = (origin: MeetingPost, patch: Partial<MyMeetingItem>): MeetingPost => {
  return {
    ...origin,
    title: patch.title ?? origin.title,
    location: {
      ...origin.location,
      // patch.location이 있으면 그 안의 name을 쓰고, 없으면 원래 name 유지
      name: patch.location?.name ?? origin.location.name,
    },
  };
};

// ----------------------------------------------------------------------
// 2. Logic Helpers
// ----------------------------------------------------------------------

const getCurrentUserId = () => {
  const user = useAuthStore.getState().user;
  return user ? String(user.id) : "guest";
};

// meetingApi의 Mock DB를 공유 (싱크로나이즈)
function getMeetingsDB(): MeetingPost[] {
  return meetingApiLocal.__getMockDataUnsafe();
}

// ----------------------------------------------------------------------
// 3. Mock API Implementation
// ----------------------------------------------------------------------

export const myApiMock = {
  // 1. 프로필 조회
  async getProfile(): Promise<MyProfile> {
    const user = useAuthStore.getState().user;
    return {
      // ✅ [수정] MyProfile(=UserSummary)는 id가 필수입니다.
      id: user ? String(user.id) : "guest",
      nickname: user?.nickname || "액션메이트",
      avatarUrl: user?.avatarUrl ?? undefined,
    };
  },

  // 2. 프로필 수정 (AuthStore 업데이트 연동)
  async updateProfile(payload: MyProfile): Promise<MyProfile> {
    // 실제로는 API 호출 후, Store를 업데이트합니다.
    useAuthStore.getState().updateProfile({ 
        nickname: payload.nickname, 
        avatarUrl: payload.avatarUrl 
    });
    return payload;
  },

  // 3. 활동 요약
  async getSummary(): Promise<MySummary> {
    return {
      praiseCount: 12,
      // UserReputation 타입 준수
      mannerTemperature: 37.5, 
    };
  },

  // 4. 내가 만든 모임
  async getHostedMeetings(): Promise<MyMeetingItem[]> {
    const db = getMeetingsDB();
    const myId = getCurrentUserId();

    const hosted = db.filter((m) => {
        const hostId = m.host?.id;
        // 내 ID와 호스트 ID가 같거나, 명시적으로 HOST 상태인 경우
        return String(hostId) === myId || m.myState?.membershipStatus === "HOST";
    });
    
    return hosted.map(toMyItem);
  },

  // 5. 내가 참여한 모임
  async getJoinedMeetings(): Promise<MyMeetingItem[]> {
    const db = getMeetingsDB();
    
    const joined = db.filter((m) => 
      m.myState?.membershipStatus === "MEMBER" || 
      m.myState?.membershipStatus === "PENDING"
    );

    // 정렬: PENDING(대기중)이 상단, MEMBER(참여중)가 하단 (혹은 반대)
    return joined.map(toMyItem).sort((a, b) => {
        const scoreA = a.myJoinStatus === "PENDING" ? 0 : 1;
        const scoreB = b.myJoinStatus === "PENDING" ? 0 : 1;
        return scoreA - scoreB;
    });
  },

  // 6. 모임 수정 (내가 만든 모임 리스트에서 수정 시)
  async updateHostedMeeting(id: string, patch: Partial<MyMeetingItem>): Promise<MyMeetingItem> {
    const db = getMeetingsDB();
    const idx = db.findIndex((m) => String(m.id) === id);
    if (idx === -1) throw new Error("모임을 찾을 수 없습니다.");

    // 원본 데이터 수정 (Mock DB 반영)
    db[idx] = applyPatchToPost(db[idx], patch);
    
    return toMyItem(db[idx]);
  },

  // 7. 모임 삭제
  async deleteHostedMeeting(id: string): Promise<void> {
    const db = getMeetingsDB();
    const idx = db.findIndex((m) => String(m.id) === id);
    if (idx !== -1) {
       db.splice(idx, 1);
    }
  }
};

// 기본 export
export const myApi = myApiMock;