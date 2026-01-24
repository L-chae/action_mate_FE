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
export type MembershipStatus =
  | "NONE"
  | "MEMBER"
  | "PENDING"
  | "HOST"
  | "CANCELED"
  | "REJECTED";

/**
 * ✅ 화면(HomeScreen/MeetingCard 등)에서 실제로 접근하는 필드를 안전하게 보장하기 위한 UI 친화 타입
 * - shared Location/Capacity가 프로젝트마다 모양이 다를 수 있어도,
 *   "화면에서 쓰는 필드"는 optional로 확장해 타입 에러를 막습니다.
 * - 런타임 변환을 강제하지 않도록 모두 optional로 둡니다.
 */
export type MeetingLocation = Location & {
  /** HomeScreen에서 item.location?.name 을 사용 */
  name?: string;

  /** 지도/주변검색 등에서 쓰는 경우가 많아 함께 확장 */
  lat?: number;
  lng?: number;

  /** 상세 주소 텍스트가 있는 경우 */
  address?: string;
};

export type MeetingCapacity = Capacity & {
  /** HomeScreen에서 capacity?.total/current 를 사용 */
  total?: number;
  current?: number;
};

export type MeetingCapacityInput = CapacityInput & {
  /** 폼/업서트에서도 total/current를 함께 다루는 서버가 있어 optional로 확장 */
  total?: number;
  current?: number;
};

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

  // Location: 화면에서 쓰는 name 등을 위해 MeetingLocation으로 확장
  location: MeetingLocation;

  // Capacity: 화면/필터에서 total/current 접근을 위해 MeetingCapacityInput으로 확장
  capacity: MeetingCapacityInput;

  // Settings
  joinMode: JoinMode;
  conditions?: string;

  // Meta
  items?: string;
};

/**
 * ✅ 서버에서 내려오는 “읽기 모델”
 * - MeetingShape를 그대로 포함 + 서버가 확정하는 필드를 확장
 */
export type MeetingPost = Omit<MeetingShape, "capacity"> & {
  id: Id;
  status: PostStatus;

  // UI 표시용(서버가 주면 쓰고, 없으면 프론트에서 파생)
  meetingTimeText?: string;
  distanceText?: string;

  // Post에서는 total/current를 화면에서 바로 사용하므로 확장 타입으로 고정
  capacity: MeetingCapacity;

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
  /**
   * 서버에 따라 hot-item 자체 id가 없을 수 있어 HomeScreen의
   * keyExtractor(it.id || it.meetingId) 패턴을 그대로 지원
   */
  id?: Id;

  /** 실제 모임(게시글) id */
  meetingId: Id;

  badge: string;

  // 동일 키/구조 유지
  title: string;
  location: MeetingLocation;
  capacity: MeetingCapacity;
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