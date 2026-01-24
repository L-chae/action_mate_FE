import type { MeetingPostDTO, ApplicantDTO } from "./dto";
import type {
  MeetingPost,
  CategoryKey,
  Participant,
  JoinMode,
  PostStatus,
  MembershipStatus,
  HostSummary,
} from "./types";

// ✅ 1) 카테고리 안전 변환기
const parseCategory = (raw?: string): CategoryKey => {
  if (!raw) return "ETC";

  const key = raw.toUpperCase();
  switch (key) {
    case "SPORTS":
    case "운동":
      return "SPORTS";
    case "GAMES":
    case "오락":
      return "GAMES";
    case "MEAL":
    case "식사":
      return "MEAL";
    case "STUDY":
    case "공부":
    case "자유":
      return "STUDY";
    default:
      return "ETC";
  }
};

const safeJoinMode = (v?: string): JoinMode => (v === "APPROVAL" ? "APPROVAL" : "INSTANT");

const safeStatus = (v?: string): PostStatus => {
  switch (v) {
    case "OPEN":
    case "FULL":
    case "CANCELED":
    case "STARTED":
    case "ENDED":
      return v;
    default:
      return "OPEN";
  }
};

const applicantToMembership = (state?: string): MembershipStatus => {
  switch (state) {
    case "APPROVED":
      return "MEMBER";
    case "PENDING":
      return "PENDING";
    case "REJECTED":
      return "REJECTED";
    default:
      return "NONE";
  }
};

/**
 * ✅ Host 정보 생성기 (DTO에 hostId만 있을 경우 대비)
 * - DTO에 닉네임, 평점 정보가 없으므로 '알 수 없음' 및 '0점'으로 초기화합니다.
 * - 추후 상세 조회 API나 유저 조회 API를 통해 보강해야 할 수도 있습니다.
 */
const createFallbackHost = (hostId?: string): HostSummary | undefined => {
  if (!hostId) return undefined;
  return {
    id: hostId,
    nickname: "알 수 없음", // 리스트 API에서는 닉네임을 주지 않음
    avatarUrl: null,
    avgRate: 0, // 기본값
    orgTime: 0, // 기본값
    intro: undefined,
  };
};

// 2) DTO -> Domain (MeetingPost)
export const toMeetingPost = (dto: MeetingPostDTO): MeetingPost => {
  if (!dto) {
    console.warn("toMeetingPost: dto is null/undefined");
    return {} as MeetingPost;
  }

  // DTO의 capacity는 "총원"을 의미함
  const maxCapacity = Math.max(1, Number(dto.capacity ?? 1));

  return {
    id: String(dto.id),
    title: dto.title || "",
    content: dto.content || "",

    category: parseCategory(dto.category),
    meetingTime: dto.meetingTime,

    // ✅ Location: DTO(latitude, longitude) -> Domain(latitude, longitude)
    location: {
      name: dto.locationName || "",
      latitude: Number(dto.latitude ?? 0),
      longitude: Number(dto.longitude ?? 0),
    },

    // ✅ Capacity: DTO에는 currentCount가 없음 -> 0으로 초기화
    // (상세 조회 시 업데이트되거나, 별도 API가 필요할 수 있음)
    capacity: {
      max: maxCapacity,
      current: 0, 
    },

    status: safeStatus(dto.state),
    joinMode: safeJoinMode(dto.joinMode),

    // 호스트 정보 매핑 (DTO에 hostId만 존재)
    host: createFallbackHost(dto.hostId),

    // 그 외 필드 초기화
    durationMinutes: undefined,
    conditions: undefined,
    items: undefined,
    distanceText: undefined,
    meetingTimeText: undefined,
    myState: undefined,
  };
};

// 3) DTO -> Domain (Participant)
export const toParticipant = (dto: ApplicantDTO): Participant => {
  if (!dto) return {} as Participant;

  return {
    id: dto.userId,
    // 참여자 API도 닉네임을 주지 않는다면 userId를 임시로 사용
    nickname: dto.userId, 
    avatarUrl: null,
    status: applicantToMembership(dto.state),
    appliedAt: new Date().toISOString(), // 신청 시간 정보 없음 -> 현재 시간 (임시)
  };
};