import { UserSummary, UserReputation } from "@/shared/model/types";

// --- ENUMS & KEYS ---
export type CategoryKey = "SPORTS" | "GAMES" | "MEAL" | "STUDY" | "ETC";
export type HomeSort = "LATEST" | "NEAR" | "SOON";
export type JoinMode = "INSTANT" | "APPROVAL";
export type PostStatus = "OPEN" | "FULL" | "CANCELED" | "STARTED" | "ENDED";
export type MembershipStatus = "NONE" | "MEMBER" | "PENDING" | "HOST" | "CANCELED" | "REJECTED";

// --- SUB TYPES (개선됨) ---

// ✅ UserSummary + Reputation + 자기소개
export type HostSummary = UserSummary & UserReputation & {
  intro?: string;
};

// ✅ UserSummary + 참여 상태 정보
// 기존 userId -> id로 통일 (UserSummary 상속 때문)
export type Participant = UserSummary & {
  status: MembershipStatus;
  appliedAt: string; 
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
  meetingTime?: string;     
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

// --- API DTOs (입력/응답) ---
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