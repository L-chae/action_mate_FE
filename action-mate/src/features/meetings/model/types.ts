// ============================================================================
// src/features/meetings/model/types.ts
// ============================================================================
import type {
  Capacity,
  CapacityInput,
  CapacityRaw,
  ISODateTimeString,
  Id,
  JoinMode as SharedJoinMode,
  Location,
  LocationRaw,
  NormalizedId,
  UserReputation,
  UserSummary,
  UserSummaryRaw,
} from "@/shared/model/types";

/**
 * ✅ 목표(초보 + 실서비스 + 불안정 백엔드 대응)
 * 1) Raw vs UI 모델 분리
 * 2) UI 기본값 규칙(필수 표시 필드는 항상 존재)
 * 3) Id 표준화(UI는 string id)
 */

// --- ENUMS & KEYS ---
export type CategoryKey = "SPORTS" | "GAMES" | "MEAL" | "STUDY" | "ETC";
export type HomeSort = "LATEST" | "NEAR" | "SOON";
export type JoinMode = SharedJoinMode;

export type PostStatus = "OPEN" | "FULL" | "CANCELED" | "STARTED" | "ENDED";
export type MembershipStatus = "NONE" | "MEMBER" | "PENDING" | "HOST" | "CANCELED" | "REJECTED";

/**
 * ✅ UI 기본값 규칙(표준)
 */
export const MEETING_UI_DEFAULTS = {
  title: "(제목 없음)",
  locationName: "장소 미정",
  meetingTimeText: "",
  distanceText: "",
  address: "",
  capacity: { current: 0, max: 0 } satisfies Capacity,
} as const;

/** -----------------------
 * Raw (서버 응답 다양성 수용)
 * ---------------------- */

export type MeetingLocationRaw = LocationRaw;
export type MeetingCapacityRaw = CapacityRaw;

export type HostSummaryRaw = UserSummaryRaw &
  UserReputation & {
    intro?: string;
  };

export type ParticipantRaw = UserSummaryRaw & {
  status: MembershipStatus;
  appliedAt: ISODateTimeString;
};

export type MyStateRaw = {
  membershipStatus: MembershipStatus;
  canJoin: boolean;
  reason?: string;
};

export type MeetingShapeRaw = Partial<{
  category: CategoryKey;
  title: string;
  content: string;
  meetingTime: ISODateTimeString;
  durationMinutes: number;
  location: MeetingLocationRaw;
  capacity: MeetingCapacityRaw;
  joinMode: JoinMode;
  conditions: string;
  items: string;
}>;

export type MeetingPostRaw = MeetingShapeRaw & {
  id: Id;
  status?: PostStatus;

  meetingTimeText?: string;
  distanceText?: string;

  address?: string | null;

  host?: HostSummaryRaw;
  myState?: MyStateRaw;
};

export type HotMeetingItemRaw = {
  id?: Id;
  meetingId: Id;
  badge?: string;

  title?: string;
  location?: MeetingLocationRaw;
  capacity?: MeetingCapacityRaw;
};

/** -----------------------
 * UI (화면/상태관리용: 기본값/표준화된 형태)
 * ---------------------- */

export type MeetingLocation = Location;

export type MeetingCapacity = Capacity & {
  total?: number;
};

export type MeetingCapacityInput = CapacityInput & {
  total?: number;
};

export type HostSummary = UserSummary &
  UserReputation & {
    intro?: string;
  };

export type Participant = UserSummary & {
  status: MembershipStatus;
  appliedAt: ISODateTimeString;
};

export type MyState = {
  membershipStatus: MembershipStatus;
  canJoin: boolean;
  reason?: string;
};

export type MeetingShape = {
  category: CategoryKey;
  title: string;
  content?: string;

  meetingTime: ISODateTimeString;
  durationMinutes?: number;

  location: MeetingLocation;

  /**
   * ✅ UI에서는 max를 필수로 둬서 폼/검증을 단순화
   * - 서버는 number/null/undefined 혼재 가능 → mapper에서 Capacity로 정규화
   */
  capacity: MeetingCapacityInput;

  joinMode: JoinMode;
  conditions?: string;
  items?: string;
};

export type MeetingPost = Omit<MeetingShape, "capacity"> & {
  id: NormalizedId;
  status: PostStatus;

  meetingTimeText?: string;
  distanceText?: string;

  address?: string | null;

  capacity: MeetingCapacity;

  host?: HostSummary;
  myState?: MyState;
};

export type MeetingUpsert = MeetingShape;

// 조회 옵션
export type AroundMeetingsOptions = {
  radiusKm?: number;
  category?: CategoryKey | "ALL";
  sort?: HomeSort;
};

export type HotMeetingItem = {
  id?: NormalizedId;
  meetingId: NormalizedId;

  badge: string;

  title: string;
  location: MeetingLocation;
  capacity: MeetingCapacity;
};

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

  getParticipants(meetingId: Id): Promise<Participant[]>;
  approveParticipant(meetingId: Id, userId: Id): Promise<Participant[]>;
  rejectParticipant(meetingId: Id, userId: Id): Promise<Participant[]>;

  submitMeetingRating(req: { meetingId: Id; stars: number }): Promise<unknown>;
}

export type Comment = {
  id: NormalizedId;
  content: string;
  createdAt: ISODateTimeString;

  parentId?: NormalizedId;

  author: UserSummary;
};