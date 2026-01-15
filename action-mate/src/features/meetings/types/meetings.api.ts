// src/features/meetings/types/meetings.api.ts

// ✅ UI의 CategoryChips와 키값 일치
export type CategoryKey = "SPORTS" | "GAMES" | "MEAL" | "STUDY" | "ETC";

export type JoinMode = "INSTANT" | "APPROVAL";
export type PostStatus = "OPEN" | "FULL" | "CANCELED" | "STARTED" | "ENDED";
export type MembershipStatus = "NONE" | "JOINED" | "PENDING" | "CANCELED";

// ✅ 호스트 정보 (상세/프로필 모달용)
export type HostSummaryDTO = {
  id: string;
  nickname: string;
  avatarUrl?: string;
  mannerTemp: number;
  kudosCount: number;
  intro?: string;
};

// ✅ 내 참여 상태 (로그인 사용자 컨텍스트)
export type MyStateDTO = {
  membershipStatus: MembershipStatus;
  canJoin: boolean;
  reason?: string; // 초기엔 string 허용(추후 enum 권장)
};

// ✅ 서버 원본: "텍스트" 대신 원본값(시간 ISO, 거리 meters, memoUpdatedAt ISO)
export type MeetingDTO = {
  id: string;
  category: CategoryKey;

  title: string;
  content?: string;

  meetingAt: string;        // ISO string (서버 원본 시간)
  durationHours?: number;   // 서버가 hours로 준다면 유지 (가능하면 minutes 권장)

  locationText: string;
  lat?: number;
  lng?: number;

  distanceMeters?: number;  // 서버 원본 거리 (있을 때만)

  capacityJoined: number;
  capacityTotal: number;

  joinMode: JoinMode;
  status: PostStatus;

  hostMemo?: string;
  memoUpdatedAt?: string;   // ISO string (서버 원본)

  items?: string;           // 너희가 string 유지 중이면 그대로. (추후 string[] 추천)

  host?: HostSummaryDTO;
  myState?: MyStateDTO;
};
