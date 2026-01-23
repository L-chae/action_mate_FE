// src/features/meetings/model/types.ts
import type {
  Capacity,
  CapacityInput,
  ISODateTimeString,
  Id,
  Location,
  UserReputation,
  UserSummary,
} from "@/shared/model/types";

// --- ENUMS & KEYS ---
export type CategoryKey = "SPORTS" | "GAMES" | "MEAL" | "STUDY" | "ETC";
export type HomeSort = "LATEST" | "NEAR" | "SOON";
export type JoinMode = "INSTANT" | "APPROVAL";
export type PostStatus = "OPEN" | "FULL" | "CANCELED" | "STARTED" | "ENDED";
export type MembershipStatus = "NONE" | "MEMBER" | "PENDING" | "HOST" | "CANCELED" | "REJECTED";

// --- SUB TYPES ---

// HostSummary: UserSummary + Reputation + intro
export type HostSummary = UserSummary &
  UserReputation & {
    intro?: string;
  };

// Participant: UserSummary + 참여 상태
export type Participant = UserSummary & {
  status: MembershipStatus;
  appliedAt: ISODateTimeString;
};

export type MyState = {
  membershipStatus: MembershipStatus;
  canJoin: boolean;
  reason?: string;
};

/**
 * ✅ 핵심: "도메인 공통 Shape"를 분리
 * - 폼 바인딩 / API 전송 / 화면 렌더링에서 동일한 구조를 쓰게 해 변환을 최소화합니다.
 * - 서버가 관리하는 값(id, status, capacity.current 등)은 MeetingPost에서만 확장합니다.
 */
export type MeetingShape = {
  category: CategoryKey;
  title: string;
  content?: string;

  // Time: ISO String을 공통 키(meetingTime)로 통일
  meetingTime: ISODateTimeString;

  /**
   * duration은 form에서 가장 다루기 쉬운 단위(분) 하나로 통일하는 게 실무에서 실수(시간/분) 줄이는데 유리합니다.
   * - 기존 durationHours/durationMinutes는 UI 파생 값으로 처리 권장
   */
  durationMinutes?: number;

  // Location: 객체로 통일
  location: Location;

  // Capacity: 객체로 통일 (Upsert에서는 current 선택값)
  capacity: CapacityInput;

  // Settings
  joinMode: JoinMode;
  conditions?: string;

  // Meta
  items?: string;
};

/**
 * ✅ 서버에서 내려오는 “읽기 모델”
 * - MeetingShape를 그대로 포함 + 서버가 확정하는 필드를 확장
 * - capacity.current를 필수로 고정(서버가 항상 결정)
 */
export type MeetingPost = MeetingShape & {
  id: Id;
  status: PostStatus;

  // UI 표시용(서버가 주면 쓰고, 없으면 프론트에서 파생)
  meetingTimeText?: string;
  distanceText?: string;

  // Post에서는 current가 반드시 있어야 함
  capacity: Capacity;

  host?: HostSummary;
  myState?: MyState;
};

/**
 * ✅ 서버로 보내는 “쓰기 모델”
 * - MeetingShape와 동일한 구조를 그대로 사용
 * - create/update 모두 같은 shape를 쓰고,
 *   update는 Partial<MeetingUpsert>로 처리
 */
export type MeetingUpsert = MeetingShape;

// 조회 옵션
export type AroundMeetingsOptions = {
  radiusKm?: number;
  category?: CategoryKey | "ALL";
  sort?: HomeSort;
};

/**
 * HotMeetingItem도 location/capacity shape를 MeetingPost와 맞춰
 * 리스트/상세/폼 간 이동 시 변환을 최소화합니다.
 */
export type HotMeetingItem = {
  id: Id;
  meetingId: Id;
  badge: string;

  // 동일 키/구조 유지
  title: string;
  location: Location;
  capacity: Capacity;
};

/**
 * --- API Interface ---
 * - create/update가 MeetingUpsert 기반
 * - 서버 응답은 MeetingPost 기반
 */
export interface MeetingApi {
  listHotMeetings(opts?: { limit?: number; withinMinutes?: number }): Promise<HotMeetingItem[]>;
  listMeetings(opts?: { category?: CategoryKey | "ALL"; sort?: HomeSort }): Promise<MeetingPost[]>;
  listMeetingsAround(lat: number, lng: number, opts?: AroundMeetingsOptions): Promise<MeetingPost[]>;
  getMeeting(id: Id): Promise<MeetingPost>;

  createMeeting(data: MeetingUpsert): Promise<MeetingPost>;
  updateMeeting(id: Id, data: Partial<MeetingUpsert>): Promise<MeetingPost>;

  joinMeeting(id: Id): Promise<{ post: MeetingPost; membershipStatus: MembershipStatus }>;
  cancelJoin(id: Id): Promise<{ post: MeetingPost }>;
  cancelMeeting(id: Id): Promise<{ post: MeetingPost }>;

  // 참여자 관리
  getParticipants(meetingId: Id): Promise<Participant[]>;
  approveParticipant(meetingId: Id, userId: Id): Promise<Participant[]>;
  rejectParticipant(meetingId: Id, userId: Id): Promise<Participant[]>;

  // 별점 평가
  submitMeetingRating(req: { meetingId: Id; stars: number }): Promise<unknown>;
}

/**
 * 댓글 타입도 author를 UserSummary로 통일하면
 * authorId/닉네임/avatarUrl의 중복 필드를 유지하지 않아도 되어 관리가 단순해집니다.
 */
export type Comment = {
  id: Id;
  content: string;
  createdAt: ISODateTimeString;

  parentId?: Id;

  // ✅ 통일된 author shape
  author: UserSummary;
};