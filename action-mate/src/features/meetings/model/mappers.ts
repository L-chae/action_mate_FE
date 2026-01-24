// src/features/meetings/model/mappers.ts
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
import { nowIso } from "@/shared/utils/timeText";
/**
 * ✅ Meetings Mapper (Single Source of Truth)
 * - 서버 DTO <-> UI 모델 변환을 여기서만 처리
 * - 서버 누락 필드(평점/횟수/참여일 등)는 기본값 규칙으로 채움
 */


const num = (v: unknown, fallback = 0) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);

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

const toPostStatus = (s: MeetingPostDTO["state"]): PostStatus => s as PostStatus;

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

  const total = num(dto.capacity, 0);
  const current = num(dto.currentCount, 0);

  // total이 0이면 "무제한/미정" 같은 케이스일 수 있어, 꽉참 판정은 total>0일 때만
  if (total > 0 && current >= total) return { canJoin: false, reason: "정원이 가득 찼습니다." };
  return { canJoin: true as const };
};

export const toMeetingPost = (dto: MeetingPostDTO): MeetingPost => {
  const id = String(dto.id);
  const category = toCategoryKey(dto.category);

  const total = num(dto.capacity, 0);
  const safeMax = total > 0 ? Math.max(1, total) : 0;
  const safeCurrent = Math.max(0, num(dto.currentCount, 0));

  const membershipStatus = toMembershipStatus(dto.myParticipationStatus);
  const canJoinInfo = calcCanJoin(dto);

  return {
    id,
    category,
    title: str(dto.title, ""),
    content: dto.content ? dto.content : undefined,
    meetingTime: str(dto.meetingTime, nowIso()),

    // ✅ location: lat/lng + latitude/longitude 동시 제공(코드 혼재 방어)
    location: {
      name: str(dto.locationName, ""),
      lat: num(dto.latitude, 0),
      lng: num(dto.longitude, 0),
      latitude: num(dto.latitude, 0),
      longitude: num(dto.longitude, 0),
      address: undefined,
    } as any,

    // ✅ capacity: max/current 중심 + total alias 유지(코드 혼재 방어)
    capacity: {
      max: safeMax,
      total: safeMax, // alias
      current: safeCurrent,
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
      // ✅ 이미 참여 상태면 canJoin은 false로 고정(중복 참여/재요청 방지)
      canJoin: membershipStatus === "NONE" ? canJoinInfo.canJoin : false,
      reason: membershipStatus === "NONE" ? (canJoinInfo as any).reason : undefined,
    },

    conditions: undefined,
    items: undefined,
  };
};

export const toPostCreateRequest = (data: MeetingUpsert): PostCreateRequestDTO => {
  const total = num((data.capacity as any)?.total ?? (data.capacity as any)?.max, 0);
  const capacity = total > 0 ? total : undefined;

  const lat = num((data.location as any)?.lat ?? (data.location as any)?.latitude, 0);
  const lng = num((data.location as any)?.lng ?? (data.location as any)?.longitude, 0);

  return {
    category: toPostCategory(data.category),
    title: data.title,
    content: data.content ?? "",
    meetingTime: data.meetingTime,

    locationName: str((data.location as any)?.name, ""),
    latitude: lat,
    longitude: lng,

    capacity,
    joinMode: data.joinMode,
  };
};

export const toPostUpdateRequest = (patch: Partial<MeetingUpsert>): PostUpdateRequestDTO => {
  const total = (patch.capacity as any)?.total ?? (patch.capacity as any)?.max;
  const capacity = typeof total === "number" && Number.isFinite(total) && total > 0 ? total : undefined;

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