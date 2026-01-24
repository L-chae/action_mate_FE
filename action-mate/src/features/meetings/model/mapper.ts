// src/features/meetings/model/mapper.ts
import type {
  ApplicantDTO,
  MeetingPostDTO,
  PostCategoryDTO,
  PostCreateRequestDTO,
  PostUpdateRequestDTO,
} from "./dto";
import type {
  CategoryKey,
  MeetingPost,
  MeetingUpsert,
  MembershipStatus,
  Participant,
  PostStatus,
} from "./types";

/**
 * ✅ Meetings Mapper
 * - 서버 DTO <-> UI 모델 변환을 여기서만 처리
 * - 서버 누락 필드(평점/횟수/참여일 등)는 기본값 규칙으로 채움
 */

const nowIso = () => new Date().toISOString();

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

const toPostStatus = (s: MeetingPostDTO["state"]): PostStatus => s;

const toMembershipStatus = (v?: MeetingPostDTO["myParticipationStatus"]): MembershipStatus => {
  switch (v) {
    case "HOST":
      return "HOST";
    case "MEMBER":
      return "MEMBER";
    case "PENDING":
      return "PENDING";
    default:
      return "NONE";
  }
};

const calcCanJoin = (dto: MeetingPostDTO) => {
  if (dto.state !== "OPEN") return { canJoin: false, reason: "모집 중이 아닙니다." };
  const total = typeof dto.capacity === "number" ? dto.capacity : 0;
  const current = typeof dto.currentCount === "number" ? dto.currentCount : 0;
  if (total > 0 && current >= total) return { canJoin: false, reason: "정원이 가득 찼습니다." };
  return { canJoin: true };
};

export const toMeetingPost = (dto: MeetingPostDTO): MeetingPost => {
  const id = String(dto.id);
  const category = toCategoryKey(dto.category);

  const total = typeof dto.capacity === "number" ? Math.max(1, dto.capacity) : 0;
  const current = typeof dto.currentCount === "number" ? Math.max(0, dto.currentCount) : 0;

  const membershipStatus = toMembershipStatus(dto.myParticipationStatus);
  const canJoinInfo = calcCanJoin(dto);

  return {
    id,
    category,
    title: dto.title ?? "",
    content: dto.content ?? undefined,
    meetingTime: dto.meetingTime,

    // location: lat/lng + latitude/longitude 동시 제공(코드 혼재 방어)
    location: {
      name: dto.locationName ?? "",
      lat: dto.latitude,
      lng: dto.longitude,
      latitude: dto.latitude,
      longitude: dto.longitude,
      address: undefined,
    } as any,

    // capacity: total/current 중심 + max도 같이 제공(코드 혼재 방어)
    capacity: {
      total: total || 0,
      max: total || 0,
      current,
    } as any,

    joinMode: dto.joinMode,
    status: toPostStatus(dto.state),
    meetingTimeText: undefined,
    distanceText: undefined,

    host: dto.writerId
      ? ({
          id: dto.writerId,
          nickname: dto.writerNickname ?? dto.writerId,
          avatarUrl: dto.writerImageUrl ?? null,
          avgRate: 0,
          orgTime: 0,
        } as any)
      : undefined,

    myState: {
      membershipStatus,
      canJoin: membershipStatus === "NONE" ? canJoinInfo.canJoin : false,
      reason: membershipStatus === "NONE" ? canJoinInfo.reason : undefined,
    },

    conditions: undefined,
    items: undefined,
  };
};

export const toPostCreateRequest = (data: MeetingUpsert): PostCreateRequestDTO => {
  const total = Number((data.capacity as any)?.total ?? (data.capacity as any)?.max ?? 0);
  const capacity = Number.isFinite(total) && total > 0 ? total : undefined;

  return {
    category: toPostCategory(data.category),
    title: data.title,
    content: data.content ?? "",
    meetingTime: data.meetingTime,

    locationName: (data.location as any)?.name ?? "",
    latitude: Number((data.location as any)?.lat ?? (data.location as any)?.latitude ?? 0),
    longitude: Number((data.location as any)?.lng ?? (data.location as any)?.longitude ?? 0),

    capacity,
    joinMode: data.joinMode,
  };
};

export const toPostUpdateRequest = (patch: Partial<MeetingUpsert>): PostUpdateRequestDTO => {
  const total = (patch.capacity as any)?.total ?? (patch.capacity as any)?.max;
  const capacity =
    typeof total === "number" && Number.isFinite(total) && total > 0 ? total : undefined;

  const lat = (patch.location as any)?.lat ?? (patch.location as any)?.latitude;
  const lng = (patch.location as any)?.lng ?? (patch.location as any)?.longitude;

  return {
    category: patch.category ? toPostCategory(patch.category) : undefined,
    title: patch.title,
    content: patch.content,
    meetingTime: patch.meetingTime,

    locationName: (patch.location as any)?.name,
    latitude: typeof lat === "number" ? lat : undefined,
    longitude: typeof lng === "number" ? lng : undefined,

    capacity,
    joinMode: patch.joinMode,
  };
};

export const toMembershipStatusFromApplicant = (dto: ApplicantDTO): MembershipStatus => {
  switch (dto.state) {
    case "APPROVED":
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
    id: dto.userId,
    nickname: dto.userId, // 서버에 닉네임/프로필이 없으므로 기본값
    avatarUrl: null,
    status: toMembershipStatusFromApplicant(dto),
    appliedAt: nowIso(), // 서버에 신청시간이 없으므로 기본값(실서비스면 서버 필드 추가 권장)
  };
};