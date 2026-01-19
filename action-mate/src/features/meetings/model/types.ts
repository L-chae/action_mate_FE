// --- ENUMS & KEYS ---
export type CategoryKey = "SPORTS" | "GAMES" | "MEAL" | "STUDY" | "ETC";
export type HomeSort = "LATEST" | "NEAR" | "SOON";
export type JoinMode = "INSTANT" | "APPROVAL";
export type PostStatus = "OPEN" | "FULL" | "CANCELED" | "STARTED" | "ENDED";
export type MembershipStatus = "NONE" | "MEMBER" | "PENDING" | "HOST" | "CANCELED" | "REJECTED";

// --- SUB TYPES ---
export type HostSummary = {
  id: string;
  nickname: string;
  avatarUrl?: string;
  mannerTemp: number;
  kudosCount: number;
  intro?: string;
};

export type MyState = {
  membershipStatus: MembershipStatus;
  canJoin: boolean;
  reason?: string;
};

// --- MAIN ENTITY ---
export type MeetingPost = {
  id: string;
  category: CategoryKey;
  title: string;
  content?: string; 

  // Time
  meetingTimeText?: string;
  meetingTime?: string; // ISO String
  durationHours?: number;
  durationMinutes?: number;

  // Location
  locationText: string;
  locationLat?: number;
  locationLng?: number;
  distanceText?: string;

  // Capacity
  capacityJoined: number;
  capacityTotal: number;

  // Settings
  joinMode: JoinMode;
  conditions?: string;
  status: PostStatus;
  
  // Meta
  items?: string;
  host?: HostSummary;
  myState?: MyState; 
};

// --- API DTOs (Request/Response Types) ---

// 모임 생성/수정 Params
export type MeetingParams = {
  title: string;
  category: CategoryKey;
  meetingTimeText?: string;
  meetingTimeIso: string;
  locationText: string;
  locationLat?: number;
  locationLng?: number;
  capacityTotal: number;
  content: string;
  joinMode: JoinMode;
  conditions?: string;
  durationMinutes: number;
  items?: string;
};

// 지도/주변 조회 옵션
export type AroundMeetingsOptions = {
  radiusKm?: number;
  category?: CategoryKey | "ALL";
  sort?: HomeSort;
};

// 홈 핫딜 카드 아이템
export type HotMeetingItem = {
  id: string;
  meetingId: string;
  badge: string;
  title: string;
  place: string;
  capacityJoined: number;
  capacityTotal: number;
};

export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  authorNickname: string;
  authorAvatarUrl?: string;
  content: string;
  createdAt: string;
};

// 참여자 정보 타입
export type Participant = {
  userId: string;
  nickname: string;
  avatarUrl?: string;
  status: MembershipStatus; // PENDING, MEMBER, REJECTED
  appliedAt: string;
};