// src/features/meetings/model/mapper.ts

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

// ✅ 1) 카테고리 안전 변환기 (앱 크래시 방지)
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

// DTO에 host 상세가 없을 때도 UI가 깨지지 않게 최소 HostSummary 채움
const fallbackHost = (hostId?: string): HostSummary | undefined => {
  if (!hostId) return undefined;
  return {
    id: hostId,
    nickname: hostId,
    avatarUrl: null,
    mannerTemperature: 36.5,
    praiseCount: 0,
    intro: undefined,
  };
};

// 2) DTO -> Domain (MeetingPost)
export const toMeetingPost = (dto: MeetingPostDTO): MeetingPost => {
  if (!dto) {
    console.warn("toMeetingPost: dto is null/undefined");
    return {} as MeetingPost;
  }

  const total = Math.max(1, Number(dto.capacity ?? 1));

  return {
    id: String(dto.id),
    title: dto.title || "",
    content: dto.content || "",

    category: parseCategory(dto.category),
    meetingTime: dto.meetingTime,

    location: {
      name: dto.locationName || "",
      lat: Number(dto.latitude ?? 0),
      lng: Number(dto.longitude ?? 0),
    },

    // 백엔드가 current를 안 주므로 0으로 둠 (추후 참가/상태 API로 보강 가능)
    capacity: {
      total,
      current: 0,
    },

    status: safeStatus(dto.state),
    joinMode: safeJoinMode(dto.joinMode),

    // DTO에 없는 필드는 undefined로 유지 (UI 파생/추가 API로 채움)
    durationMinutes: undefined,
    conditions: undefined,
    items: undefined,
    distanceText: undefined,
    meetingTimeText: undefined,
    myState: undefined,
    host: fallbackHost(dto.hostId),
  };
};

// 3) DTO -> Domain (Participant)
export const toParticipant = (dto: ApplicantDTO): Participant => {
  if (!dto) return {} as Participant;

  return {
    id: dto.userId,
    nickname: dto.userId, // 닉네임이 없으므로 userId를 기본 표시값으로 사용
    avatarUrl: null,
    status: applicantToMembership(dto.state),
    appliedAt: new Date().toISOString(), // DTO에 없으므로 현재시각 (필요시 서버 필드 추가 권장)
  };
};