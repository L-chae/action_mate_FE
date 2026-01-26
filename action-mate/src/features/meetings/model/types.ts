// src/features/meetings/model/types.ts
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
 * ✅ 목표(초보 + 실서비스 + 백엔드 v1.2.4 정합)
 * 1) Raw vs UI 모델 분리
 * 2) UI 기본값 규칙(필수 표시 필드는 항상 존재)
 * 3) Id 표준화(UI는 string id)
 */

// --- ENUMS & KEYS ---
// v1.2.4 PostCategory: "운동" | "오락" | "식사" | "자유"
export type CategoryKey = "운동" | "오락" | "식사" | "자유";
export type HomeSort = "LATEST" | "NEAR" | "SOON";
export type JoinMode = SharedJoinMode;

// v1.2.4 Post.state: OPEN | STARTED | ENDED | FULL | CANCELED
export type PostStatus = "OPEN" | "FULL" | "CANCELED" | "STARTED" | "ENDED";

// v1.2.4 myParticipationStatus + Applicant.state 정합(필요 범위만)
export type MembershipStatus = "NONE" | "MEMBER" | "PENDING" | "HOST" | "REJECTED";

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

  // 서버(v1.2.4)는 state 필드를 사용하므로 state를 우선 정규화 대상으로 둠
  state?: PostStatus;

  // 기존 코드 호환이 필요할 수 있어 status도 남겨둘 수 있지만,
  // 실제 정규화는 state를 기준으로 하는 것을 권장
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

/**
 * --- API Interface ---
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

/*
요약:
1) v1.2.4 정합: CategoryKey를 "운동/오락/식사/자유", MembershipStatus를 HOST/MEMBER/PENDING/REJECTED/NONE로 수정.
2) Post 상태 필드가 state이므로 Raw에 state를 추가(정규화 기준), 기존 status는 호환용 optional로 유지.
3) 나머지 UI 타입 구조는 유지하여 화면/스토어 의존 코드 영향 최소화.
*/