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
export type MembershipStatus =
  | "NONE"
  | "MEMBER"
  | "PENDING"
  | "HOST"
  | "CANCELED"
  | "REJECTED";

/**
 * ✅ UI 기본값 규칙(표준)
 * - 서버가 느리거나 일부 필드가 비어도 화면이 "깨지지 않도록" 최소 표시값을 보장하는 정책
 * - 실제 기본값 적용은 API 레이어(매퍼)에서 수행하는 것을 권장합니다.
 */
export const MEETING_UI_DEFAULTS = {
  title: "(제목 없음)",
  locationName: "장소 미정",
  meetingTimeText: "",
  distanceText: "",
  capacity: { current: 0, max: 0 } satisfies Capacity,
} as const;

/** -----------------------
 * Raw (서버 응답 다양성 수용)
 * ---------------------- */

/**
 * 서버 Location이 흔들리는 케이스를 그대로 수용
 * - shared.LocationRaw를 그대로 사용(키 다양성 허용)
 */
export type MeetingLocationRaw = LocationRaw;

/**
 * 서버 Capacity가 흔들리는 케이스 수용
 * - max/total 혼재 허용
 */
export type MeetingCapacityRaw = CapacityRaw;

/**
 * HostSummary Raw: 서버 유저 id가 number/string 섞일 수 있으므로 UserSummaryRaw 기반
 */
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

/**
 * ✅ MeetingShapeRaw
 * - 서버가 보내는 키/값이 일부 누락/변형될 수 있는 환경을 수용
 * - 단, "키 이름 자체"가 완전히 바뀌는 경우는 매퍼에서 처리해야 합니다.
 */
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

/**
 * ✅ MeetingLocation(UI)
 * - name은 UI에서 항상 표시해야 하므로 required(기본값 적용 가정)
 * - 좌표는 지도 기능에서만 필요하므로 null 허용(Location 공통 타입 사용)
 */
export type MeetingLocation = Location;

/**
 * ✅ MeetingCapacity(UI)
 * - UI에서는 current/max가 항상 존재(기본값 적용 가정)
 */
export type MeetingCapacity = Capacity;

/**
 * ✅ MeetingCapacityInput(UI)
 * - 전송용은 일반적으로 max가 필수이지만,
 *   폼 상태(draft)는 비어있을 수 있으니 draft를 따로 두는 게 안전합니다.
 * - 여기서는 "서버 전송용"을 명확히 하기 위해 max required 유지.
 */
export type MeetingCapacityInput = CapacityInput;

/**
 * HostSummary(UI): UserSummary(id는 정규화된 string) 기반
 */
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

/**
 * ✅ MeetingShape(UI)
 * - 화면/폼/전송에서 "기준이 되는 안정 shape"
 * - 기본값/정규화가 적용된 이후에는 필드 접근이 단순해집니다.
 */
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

/**
 * ✅ MeetingPost(UI)
 * - id는 NormalizedId(string)
 * - title/location/capacity는 기본값 규칙으로 항상 표시 가능하다고 가정
 */
export type MeetingPost = Omit<MeetingShape, "capacity"> & {
  id: NormalizedId;
  status: PostStatus;

  meetingTimeText?: string;
  distanceText?: string;

  capacity: MeetingCapacity;

  host?: HostSummary;
  myState?: MyState;
};

/**
 * ✅ MeetingUpsert(UI)
 * - 전송 모델: MeetingShape 그대로 사용
 */
export type MeetingUpsert = MeetingShape;

// 조회 옵션
export type AroundMeetingsOptions = {
  radiusKm?: number;
  category?: CategoryKey | "ALL";
  sort?: HomeSort;
};

/**
 * ✅ HotMeetingItem(UI)
 * - list key가 안정적으로 동작하도록 meetingId는 NormalizedId로 표준화
 * - id는 서버에 따라 없을 수 있어 optional 유지
 */
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
 * - 호출 파라미터는 Id(유연) 허용
 * - 반환은 UI 모델(정규화/기본값 적용된 형태)로 고정하는 것을 권장
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
 * 댓글 타입(UI)
 */
export type Comment = {
  id: NormalizedId;
  content: string;
  createdAt: ISODateTimeString;

  parentId?: NormalizedId;

  author: UserSummary;
};