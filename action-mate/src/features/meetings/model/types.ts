// src/features/meetings/model/types.ts

// --- ENUMS & KEYS ---
export type CategoryKey = "SPORTS" | "GAMES" | "MEAL" | "STUDY" | "ETC";
export type HomeSort = "LATEST" | "NEAR" | "SOON";
export type JoinMode = "INSTANT" | "APPROVAL";
export type PostStatus = "OPEN" | "FULL" | "CANCELED" | "STARTED" | "ENDED";
// REJECTED 추가 (거절된 상태)
export type MembershipStatus = "NONE" | "MEMBER" | "PENDING" | "HOST" | "CANCELED" | "REJECTED";

// --- SUB TYPES ---
export type HostSummary = {
  id: string;
  nickname: string;
  avatar?: string | null; // 통일됨 (avatarUrl -> avatar)
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
  id: string; // 게시글 ID
  category: CategoryKey;
  title: string;
  content?: string; 

  // Time
  meetingTimeText?: string; // "오늘 14:00" (UI용)
  meetingTime?: string;     // "2024-01-20T14:00:00" (ISO, 필수 권장)
  durationHours?: number;   
  durationMinutes?: number; 

  // Location
  locationText: string;
  locationLat?: number;
  locationLng?: number;
  distanceText?: string; // "1.2km" (UI용)

  // Capacity
  capacityJoined: number;
  capacityTotal: number;

  // Settings
  joinMode: JoinMode;
  conditions?: string;
  status: PostStatus;

  // Meta
  items?: string;       // 준비물
  host?: HostSummary;   // 호스트 정보
  myState?: MyState;    // 내 참여 상태
};

// --- API DTOs ---

export type MeetingParams = {
  title: string;
  category: CategoryKey;
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

export type AroundMeetingsOptions = {
  radiusKm?: number;
  category?: CategoryKey | "ALL";
  sort?: HomeSort;
};

export type HotMeetingItem = {
  id: string;
  meetingId: string;
  badge: string;
  title: string;
  place: string;
  capacityJoined: number;
  capacityTotal: number;
};

// 참여자 정보 타입 (API 응답)
export type Participant = {
  userId: string;
  nickname: string;
  avatar?: string | null;
  status: MembershipStatus;
  appliedAt: string; // ISO Date
};

// --- API Interface ---
export interface MeetingApi {
  listHotMeetings(opts?: { limit?: number; withinMinutes?: number }): Promise<HotMeetingItem[]>;
  listMeetings(opts?: { category?: CategoryKey | "ALL"; sort?: HomeSort }): Promise<MeetingPost[]>;
  listMeetingsAround(lat: number, lng: number, opts?: AroundMeetingsOptions): Promise<MeetingPost[]>;
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