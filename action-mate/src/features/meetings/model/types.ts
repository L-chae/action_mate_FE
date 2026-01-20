// src/features/meetings/model/types.ts

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
  // ✅ [수정] avatarUrl -> avatar 로 통일
  avatar?: string | null;
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
  // ✅ [수정] authorAvatarUrl -> authorAvatar 로 통일
  authorAvatar?: string | null;
  content: string;
  createdAt: string;
};

// 참여자 정보 타입
export type Participant = {
  userId: string;
  nickname: string;
  // ✅ [수정] avatarUrl -> avatar 로 통일
  avatar?: string | null;
  status: MembershipStatus; // PENDING, MEMBER, REJECTED
  appliedAt: string;
};

// --- API Interface ---
export interface MeetingApi {
  listHotMeetings(opts?: { limit?: number; withinMinutes?: number }): Promise<HotMeetingItem[]>;
  listMeetings(opts?: { category?: CategoryKey | "ALL"; sort?: HomeSort }): Promise<MeetingPost[]>;
  listMeetingsAround(
    lat: number,
    lng: number,
    opts?: AroundMeetingsOptions
  ): Promise<MeetingPost[]>;
  getMeeting(id: string): Promise<MeetingPost>;

  createMeeting(data: MeetingParams): Promise<MeetingPost>;
  updateMeeting(id: string, data: Partial<MeetingParams>): Promise<MeetingPost>;
  joinMeeting(id: string): Promise<{ post: MeetingPost; membershipStatus: MembershipStatus }>;
  cancelJoin(id: string): Promise<{ post: MeetingPost }>;
  cancelMeeting(id: string): Promise<{ post: MeetingPost }>;

  // 참여자 관리
  getParticipants(meetingId: string): Promise<Participant[]>;
  approveParticipant(meetingId: string, userId: string): Promise<Participant[]>;
  rejectParticipant(meetingId: string, userId: string): Promise<Participant[]>;
}