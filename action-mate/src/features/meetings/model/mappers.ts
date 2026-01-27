// ============================================================================
// src/features/meetings/model/mappers.ts
// ============================================================================
import type { ApplicantDTO, MeetingPostDTO, PostCategoryDTO, PostCreateRequestDTO, PostUpdateRequestDTO } from "./dto";
import type { CategoryKey, MeetingPost, MeetingUpsert, MembershipStatus, Participant, PostStatus } from "./types";
import { MEETING_UI_DEFAULTS } from "./types";
import { nowIso } from "@/shared/utils/timeText";
import { normalizeId } from "@/shared/model/types";
import { mapCapacityRawToCapacity, mapUserSummaryRawToUserSummary } from "@/shared/model/mappers";
import type { CapacityRaw, LocationRaw, UserSummaryRaw } from "@/shared/model/types";

/**
 * ✅ Meetings Mapper (Single Source of Truth)
 * - 서버 DTO <-> UI 모델 변환을 여기서만 처리
 * - 화면/스토어는 UI 모델만 사용 (불안정 응답은 여기서 흡수)
 */

const isNonEmptyString = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";

const toNumberOrNull = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const toIntOrZero = (v: unknown): number => {
  const n = toNumberOrNull(v);
  if (n == null) return 0;
  return Math.max(0, Math.trunc(n));
};

const toCategoryKey = (c: PostCategoryDTO): CategoryKey => {
  switch (c) {
    case "운동":
      return "SPORTS";
    case "오락":
      return "GAMES";
    case "식사":
      return "MEAL";
    case "자유":
    default:
      return "ETC";
  }
};

export const toPostCategory = (c: CategoryKey): PostCategoryDTO => {
  switch (c) {
    case "SPORTS":
      return "운동";
    case "GAMES":
      return "오락";
    case "MEAL":
      return "식사";
    case "STUDY":
    case "ETC":
    default:
      return "자유";
  }
};

const toPostStatus = (v: unknown): PostStatus => {
  switch (v) {
    case "OPEN":
    case "FULL":
    case "CANCELED":
    case "STARTED":
    case "ENDED":
      return v as PostStatus;
    default:
      return "OPEN";
  }
};

const toMembershipStatus = (v?: MeetingPostDTO["myParticipationStatus"] | null): MembershipStatus => {
  switch (v) {
    case "HOST":
      return "HOST";
    case "MEMBER":
      return "MEMBER";
    case "PENDING":
      return "PENDING";
    case "NONE":
    default:
      return "NONE";
  }
};

const calcCanJoin = (dto: MeetingPostDTO) => {
  const status = toPostStatus(dto.state);

  if (status !== "OPEN") return { canJoin: false as const, reason: "모집 중이 아닙니다." };

  const total = toIntOrZero(dto.capacity);
  const current = toIntOrZero(dto.currentCount);

  if (total > 0 && current >= total) return { canJoin: false as const, reason: "정원이 가득 찼습니다." };
  return { canJoin: true as const };
};

const makeLocationRawFromDto = (dto: MeetingPostDTO): LocationRaw => {
  return {
    name: isNonEmptyString(dto.locationName) ? dto.locationName : MEETING_UI_DEFAULTS.locationName,
    latitude: toNumberOrNull(dto.latitude) ?? undefined,
    longitude: toNumberOrNull(dto.longitude) ?? undefined,
    address: null,
  };
};

const makeCapacityRawFromDto = (dto: MeetingPostDTO): CapacityRaw => {
  return {
    current: toIntOrZero(dto.currentCount),
    max: toIntOrZero(dto.capacity),
    total: toIntOrZero(dto.capacity),
  };
};

export const toMeetingPost = (dto: MeetingPostDTO): MeetingPost => {
  const id = normalizeId(dto.id);
  const category = toCategoryKey(dto.category);

  const title = isNonEmptyString(dto.title) ? dto.title : MEETING_UI_DEFAULTS.title;
  const content = isNonEmptyString(dto.content) ? dto.content : undefined;
  const meetingTime = isNonEmptyString(dto.meetingTime) ? dto.meetingTime : nowIso();

  const membershipStatus = toMembershipStatus(dto.myParticipationStatus);
  const canJoinInfo = calcCanJoin(dto);

  const locationRaw = makeLocationRawFromDto(dto);
  const mappedLocation = (() => {
    const name = isNonEmptyString(locationRaw.name) ? locationRaw.name : MEETING_UI_DEFAULTS.locationName;
    const latitude = toNumberOrNull((locationRaw as any)?.latitude ?? (locationRaw as any)?.lat) ?? null;
    const longitude = toNumberOrNull((locationRaw as any)?.longitude ?? (locationRaw as any)?.lng) ?? null;
    const address = isNonEmptyString((locationRaw as any)?.address) ? (locationRaw as any).address : null;
    return { name, latitude, longitude, address };
  })();

  const capacityRaw = makeCapacityRawFromDto(dto);
  const cap = mapCapacityRawToCapacity(capacityRaw);
  const max = cap.max > 0 ? cap.max : 0;

  const writerId = isNonEmptyString(dto.writerId) ? dto.writerId : "";
  const writerNickname = isNonEmptyString(dto.writerNickname) ? dto.writerNickname : "";
  const writerImageUrl = isNonEmptyString(dto.writerImageUrl) ? dto.writerImageUrl : null;

  const host = writerId
    ? ({
        ...mapUserSummaryRawToUserSummary(
          { id: writerId, nickname: writerNickname || writerId, avatarUrl: writerImageUrl } as UserSummaryRaw,
          { fallbackId: writerId, fallbackNickname: writerNickname || writerId },
        ),
        avgRate: 0,
        orgTime: 0,
      } as any)
    : undefined;

  return {
    id,
    category,
    title,
    content,
    meetingTime,

    address: undefined,

    location: mappedLocation,
    capacity: { current: cap.current, max, total: max },

    joinMode: dto.joinMode,
    status: toPostStatus(dto.state),

    meetingTimeText: undefined,
    distanceText: undefined,

    host,

    myState: {
      membershipStatus,
      canJoin: membershipStatus === "NONE" ? canJoinInfo.canJoin : false,
      reason: membershipStatus === "NONE" ? (canJoinInfo.canJoin ? undefined : canJoinInfo.reason) : undefined,
    },

    conditions: undefined,
    items: undefined,
  };
};

export const toPostCreateRequest = (data: MeetingUpsert): PostCreateRequestDTO => {
  const total = toIntOrZero((data.capacity as any)?.total ?? (data.capacity as any)?.max);
  const capacity = total > 0 ? total : undefined;

  const lat = toNumberOrNull((data.location as any)?.latitude ?? (data.location as any)?.lat) ?? 0;
  const lng = toNumberOrNull((data.location as any)?.longitude ?? (data.location as any)?.lng) ?? 0;

  return {
    category: toPostCategory(data.category),
    title: isNonEmptyString(data.title) ? data.title : MEETING_UI_DEFAULTS.title,
    content: isNonEmptyString(data.content) ? data.content! : "",
    meetingTime: isNonEmptyString(data.meetingTime) ? data.meetingTime : nowIso(),

    locationName: isNonEmptyString(data.location?.name) ? data.location.name : MEETING_UI_DEFAULTS.locationName,
    latitude: lat,
    longitude: lng,

    capacity,
    joinMode: data.joinMode,
  };
};

export const toPostUpdateRequest = (patch: Partial<MeetingUpsert>): PostUpdateRequestDTO => {
  const total = (patch.capacity as any)?.total ?? (patch.capacity as any)?.max;
  const capacity = typeof total === "number" && Number.isFinite(total) && total > 0 ? Math.trunc(total) : undefined;

  const lat = (patch.location as any)?.latitude ?? (patch.location as any)?.lat;
  const lng = (patch.location as any)?.longitude ?? (patch.location as any)?.lng;

  return {
    category: patch.category ? toPostCategory(patch.category) : undefined,
    title: patch.title,
    content: patch.content,
    meetingTime: patch.meetingTime,

    locationName: (patch.location as any)?.name,
    latitude: typeof lat === "number" && Number.isFinite(lat) ? lat : undefined,
    longitude: typeof lng === "number" && Number.isFinite(lng) ? lng : undefined,

    capacity,
    joinMode: patch.joinMode,
  };
};

export const toMembershipStatusFromApplicant = (dto: ApplicantDTO): MembershipStatus => {
  switch (dto.state) {
    case "HOST":
      return "HOST";
    case "MEMBER":
      return "MEMBER";
    case "REJECTED":
      return "REJECTED";
    case "PENDING":
    default:
      return "PENDING";
  }
};

export const toParticipant = (dto: ApplicantDTO): Participant => {
  return {
    ...mapUserSummaryRawToUserSummary(
      { id: dto.userId, nickname: dto.userId, avatarUrl: null } as UserSummaryRaw,
      { fallbackId: dto.userId, fallbackNickname: dto.userId },
    ),
    status: toMembershipStatusFromApplicant(dto),
    appliedAt: nowIso(),
  };
};