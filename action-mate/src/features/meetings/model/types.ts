import { UserSummary, UserReputation } from "@/shared/model/types";

// --- ENUMS & KEYS ---
export type CategoryKey = "SPORTS" | "GAMES" | "MEAL" | "STUDY" | "ETC";
export type HomeSort = "LATEST" | "NEAR" | "SOON";
export type JoinMode = "INSTANT" | "APPROVAL";
export type PostStatus = "OPEN" | "FULL" | "CANCELED" | "STARTED" | "ENDED";
export type MembershipStatus = "NONE" | "MEMBER" | "PENDING" | "HOST" | "CANCELED" | "REJECTED";

// --- SUB TYPES ---

// ✅ UserSummary + Reputation + 자기소개
export type HostSummary = UserSummary & UserReputation & {
  intro?: string;
};

// ✅ UserSummary + 참여 상태 정보
// UserSummary를 상속받으므로 id, nickname, avatarUrl이 포함됨
export type Participant = UserSummary & {
  status: MembershipStatus;
  appliedAt: string; 
};

export type MyState = {
  membershipStatus: MembershipStatus;
  canJoin: boolean;
  reason?: string;
};

// --- MAIN ENTITY (구조 개선됨) ---
export type MeetingPost = {
  id: string;
  category: CategoryKey;
  title: string;
  content?: string; 

  // Time
  meetingTime: string;      // ISO String (필수)
  meetingTimeText?: string; // UI 표시용 (옵션)
  durationHours?: number;   
  durationMinutes?: number; 

  // ✅ Location: 객체로 그룹화
  location: {
    name: string; // 기존 locationText
    lat: number;  // 기존 locationLat
    lng: number;  // 기존 locationLng
  };
  distanceText?: string; // UI용 거리 텍스트 ("1.2km")

  // ✅ Capacity: 객체로 그룹화
  capacity: {
    current: number; // 기존 capacityJoined
    total: number;   // 기존 capacityTotal
  };

  // Settings
  joinMode: JoinMode;
  conditions?: string;
  status: PostStatus;

  // Meta
  items?: string;
  host?: HostSummary;   
  myState?: MyState;
};

// --- API DTOs (입력용 Params는 입력 편의상 Flat 유지) ---
export type MeetingParams = {
  title: string;
  category: CategoryKey;
  meetingTimeIso: string;
  
  // 입력 시에는 Flat하게 받는 게 Form 관리하기 편함
  locationText: string;
  locationLat: number;
  locationLng: number;
  
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

  // ✅ [NEW] 별점 평가 (이 부분이 누락되어 에러가 발생했었습니다)
  submitMeetingRating(req: { meetingId: string; stars: number }): Promise<any>;
}

// 댓글 타입 정의
export type Comment = {
  id: string;
  authorId: string;
  authorNickname: string;
  authorAvatarUrl?: string; // 작성자 프로필 이미지
  content: string;
  createdAt: string; // ISO String
  
  // (옵션) 대댓글 구조 등을 위해 parentId 등을 추가할 수 있음
  parentId?: string;
  
  // UI용: 작성자 객체 (DetailContent에서 사용)
  author?: {
    id: string;
    nickname: string;
    avatarUrl?: string;
  };
};