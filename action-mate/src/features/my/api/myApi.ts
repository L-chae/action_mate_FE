import meetingApiLocal from "@/features/meetings/api/meetingApi.local"; 
import { useAuthStore } from "@/features/auth/model/authStore";
import type { MeetingPost, MembershipStatus } from "@/features/meetings/model/types";
import type { MyMeetingItem, MyProfile, MySummary } from "../model/types";

// ----------------------------------------------------------------------
// 1. Helpers & Mappers
// ----------------------------------------------------------------------

// ✅ [수정 1] MembershipStatus("NONE" 등 포함) -> "MEMBER" | "PENDING" | undefined 변환
const mapJoinStatus = (status?: MembershipStatus): "MEMBER" | "PENDING" | undefined => {
  if (status === "MEMBER") return "MEMBER";
  if (status === "PENDING") return "PENDING";
  return undefined; // HOST, NONE, REJECTED 등은 undefined로 처리
};

// Helper: MeetingPost -> MyMeetingItem 변환
const toMyItem = (m: MeetingPost): MyMeetingItem => ({
  id: m.id,
  title: m.title,
  place: m.location.name, // MeetingPost 구조(Nested)에 맞게 수정
  dateText: m.meetingTimeText || m.meetingTime?.split("T")[0] || "",
  memberCount: m.capacity.current, // MeetingPost 구조(Nested)에 맞게 수정
  myJoinStatus: mapJoinStatus(m.myState?.membershipStatus),
});

// Helper: MyMeetingItem 수정사항 -> MeetingPost 반영
const applyPatchToPost = (origin: MeetingPost, patch: Partial<MyMeetingItem>): MeetingPost => {
  return {
    ...origin,
    title: patch.title ?? origin.title,
    location: {
      ...origin.location,
      name: patch.place ?? origin.location.name,
    },
    // 필요한 다른 필드도 여기서 매핑
  };
};

// ----------------------------------------------------------------------
// 2. Logic Helpers
// ----------------------------------------------------------------------

const getCurrentUserId = () => {
  const user = useAuthStore.getState().user;
  return user ? user.id : "guest";
};

function getMeetingsDB(): MeetingPost[] {
  return meetingApiLocal.__getMockDataUnsafe();
}

// ----------------------------------------------------------------------
// 3. Mock API Implementation
// ----------------------------------------------------------------------

const mockApi = {
  // 1. 프로필 조회
  async getProfile(): Promise<MyProfile> {
    const user = useAuthStore.getState().user;
    return {
      nickname: user?.nickname || "액션메이트",
      // ✅ [수정 2] null 값을 undefined로 변환 (?? undefined)
      avatarUrl: user?.avatarUrl ?? undefined, 
    };
  },

  // 2. 프로필 수정
  async updateProfile(payload: MyProfile): Promise<MyProfile> {
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
      // ✅ [수정 3] UserReputation 타입에 맞춰 temperature -> mannerTemperature 변경
      mannerTemperature: 37.5, 
    };
  },

  // 4. 내가 만든 모임
  async getHostedMeetings(): Promise<MyMeetingItem[]> {
    const db = getMeetingsDB();
    const myId = getCurrentUserId();

    const hosted = db.filter((m) => {
        const hostId = m.host?.id;
        return String(hostId) === String(myId) || m.myState?.membershipStatus === "HOST";
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

    return joined.map(toMyItem).sort((a, b) => {
        const scoreA = a.myJoinStatus === "PENDING" ? 0 : 1;
        const scoreB = b.myJoinStatus === "PENDING" ? 0 : 1;
        return scoreA - scoreB;
    });
  },

  // 6. 모임 수정
  async updateHostedMeeting(id: string, patch: Partial<MyMeetingItem>): Promise<MyMeetingItem> {
    const db = getMeetingsDB();
    const idx = db.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error("모임을 찾을 수 없습니다.");

    db[idx] = applyPatchToPost(db[idx], patch);
    return toMyItem(db[idx]);
  },

  // 7. 모임 삭제
  async deleteHostedMeeting(id: string): Promise<void> {
    const db = getMeetingsDB();
    const idx = db.findIndex((m) => m.id === id);
    if (idx !== -1) {
        db.splice(idx, 1);
    }
  },
};

export const myApi = mockApi;