// src/features/meetings/model/mappers.ts
import type { ApplicantDTO, MeetingPostDTO, PostCategoryDTO, PostCreateRequestDTO, PostUpdateRequestDTO } from "./dto";
import type { CategoryKey, MeetingPost, MeetingUpsert, MembershipStatus, Participant, PostStatus } from "./types";
import { normalizeId } from "@/shared/model/types";
import { endpoints } from "@/shared/api/endpoints";
import { nowIso } from "@/shared/utils/timeText";

/**
 * Meetings Mapper (OpenAPI v1.2.4 정합)
 */

const num = (v: unknown, fallback = 0) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);

const img = (name?: string): string | null => (name ? endpoints.images.get(name) : null);

const toCategoryKey = (c: PostCategoryDTO): CategoryKey => c;

export const toPostCategory = (c: CategoryKey): PostCategoryDTO => c;

const toPostStatus = (s: MeetingPostDTO["state"]): PostStatus => s as PostStatus;

const toMembershipStatus = (v?: MeetingPostDTO["myParticipationStatus"]): MembershipStatus => {
  switch (v) {
    case "HOST":
      return "HOST";
    case "MEMBER":
      return "MEMBER";
    case "PENDING":
      return "PENDING";
    case "REJECTED":
      return "REJECTED";
    case "NONE":
    default:
      return "NONE";
  }
};

const calcCanJoin = (dto: MeetingPostDTO) => {
  if (dto.state !== "OPEN") return { canJoin: false as const, reason: "모집 중이 아닙니다." };

  const total = num(dto.capacity, 0);
  const current = num(dto.currentCount, 0);

  if (total > 0 && current >= total) return { canJoin: false as const, reason: "정원이 가득 찼습니다." };
  return { canJoin: true as const };
};

export const toMeetingPost = (dto: MeetingPostDTO): MeetingPost => {
  const id = normalizeId(dto.id);
  const category = toCategoryKey(dto.category);

  const max = num(dto.capacity, 0);
  const current = Math.max(0, num(dto.currentCount, 0));

  const membershipStatus = toMembershipStatus(dto.myParticipationStatus);
  const canJoinInfo = calcCanJoin(dto);

  const host =
    dto.writerId != null
      ? {
          id: normalizeId(dto.writerId),
          nickname: dto.writerNickname?.trim() ? dto.writerNickname : dto.writerId,
          avatarUrl: img(dto.writerImageName),
          avgRate: 0,
          orgTime: 0,
        }
      : undefined;

  return {
    id,
    category,
    title: str(dto.title, ""),
    content: dto.content?.trim() ? dto.content : undefined,
    meetingTime: str(dto.meetingTime, nowIso()),

    address: undefined,

    location: {
      name: str(dto.locationName, ""),
      latitude: num(dto.latitude, 0),
      longitude: num(dto.longitude, 0),
      address: null,
    },

    capacity: {
      max,
      total: max || undefined,
      current,
    },

    joinMode: dto.joinMode,
    status: toPostStatus(dto.state),

    meetingTimeText: undefined,
    distanceText: undefined,

    host,

    myState: {
      membershipStatus,
      canJoin: membershipStatus === "NONE" ? canJoinInfo.canJoin : false,
      reason: membershipStatus === "NONE" ? canJoinInfo.reason : undefined,
    },

    conditions: undefined,
    items: undefined,
  };
};
// (추가) 서버가 받는 카테고리로 강제 변환 (한글 enum)
// - UI에서 "GAMES" 같은 값이 넘어와도 여기서 무조건 "오락"으로 바꿔서 전송
const toServerCategory = (c: unknown): PostCategoryDTO => {
  if (c === "운동" || c === "오락" || c === "식사" || c === "자유") return c;

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

export const toPostCreateRequest = (data: MeetingUpsert): PostCreateRequestDTO => {
  const total = num((data.capacity as any)?.total ?? (data.capacity as any)?.max, 0);
  const capacity = total > 0 ? total : undefined;

  const lat = num((data.location as any)?.lat ?? (data.location as any)?.latitude, 0);
  const lng = num((data.location as any)?.lng ?? (data.location as any)?.longitude, 0);

  return {
    category: toServerCategory((data as any).category),
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
    category: patch.category != null ? toServerCategory((patch as any).category) : undefined,
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
    case "HOST":
      return "HOST";
    case "MEMBER":
      return "MEMBER";
    case "REJECTED":
      return "REJECTED";
    case "PENDING":
      return "PENDING";
    case "NONE":
    default:
      return "NONE";
  }
};

export const toParticipant = (dto: ApplicantDTO): Participant => ({
  id: normalizeId(dto.userId),
  nickname: dto.userId,
  avatarUrl: null,
  status: toMembershipStatusFromApplicant(dto),
  appliedAt: nowIso(),
});

/*
요약:
1) CategoryKey를 v1.2.4(PostCategory: "운동/오락/식사/자유")로 정합(기존 SPORTS/GAMES 매핑 제거).
2) writerImageName / myParticipationStatus(REJECTED 포함) / Applicant.state(HOST/MEMBER/...) 반영.
3) Location/Capacity를 UI 타입에 맞게(any 제거) {latitude/longitude, current/max}로 고정.
*/