// src/shared/model/types.ts

// 1. 기본 Alias
export type ISODateString = string;
/**
 * ✅ ISO DateTime(예: 2026-01-23T10:30:00Z)도 앱 전역에서 통일해 쓰기 위한 alias
 * - 기존 코드가 ISODateString을 날짜/시간 혼용해서 쓰고 있어도, 타입은 string이라 안전합니다.
 * - 미팅 도메인(meetingTime)에서 요구하는 키를 맞추기 위해 추가합니다.
 */
export type ISODateTimeString = string;

export type Id = string | number;

// ✅ 2. 공통 Enum (프론트엔드 편의를 위해 Gender는 영문 유지)
export type Gender = "male" | "female";

export type PostCategory = "운동" | "오락" | "식사" | "자유";
export type PostState = "OPEN" | "STARTED" | "ENDED" | "FULL" | "CANCELED";
export type JoinMode = "INSTANT" | "APPROVAL";
export type ApplicantState = "APPROVED" | "REJECTED" | "PENDING";
export type MyParticipationStatus = "HOST" | "MEMBER" | "PENDING" | "NONE";

// 3. 유저 관련
export type UserSummary = {
  id: string;
  nickname: string;
  avatarUrl?: string | null;
};

/**
 * ✅ UserReputation
 * - 미팅 도메인에서 HostSummary = UserSummary & UserReputation 형태로 합성하므로
 *   서버/프론트에서 실제로 쓰는 지표(avgRate, orgTime)를 공통 타입으로 분리합니다.
 */
export type UserReputation = {
  avgRate: number;
  orgTime: number;
};

// 백엔드에서 내려오는 원본 프로필 타입 (변환 전)
export interface ServerProfile {
  id: string;
  nickname: string;
  profileImageUrl?: string;
  birth: string;
  gender: "남" | "여"; // 👈 서버는 한글
  avgRate: number;
  orgTime: number;
}

// 프론트엔드 내부에서 쓸 유저 객체
export interface UserProfile {
  id: string;
  nickname: string;
  profileImageUrl?: string;
  birth: string;
  gender: Gender; // 👈 프론트는 영문
  avgRate: number;
  orgTime: number;
}

/**
 * ✅ Location
 * - 기존 Post는 locationName/latitude/longitude로 흩어져 있고,
 *   미팅 도메인은 location 객체를 기대합니다.
 * - "왜": 리스트/상세/폼 간 이동 시 변환을 최소화하려면 공통 shape가 필요합니다.
 */
export type Location = {
  name: string; // 표시 이름(= 기존 Post.locationName)
  latitude: number;
  longitude: number;
  address?: string | null;
};

/**
 * ✅ Capacity / CapacityInput
 * - 미팅 도메인은 capacity.current가 있는 읽기 모델(Capacity)과
 *   upsert용 쓰기 모델(CapacityInput)을 분리해 사용합니다.
 * - "왜": 서버가 current를 결정하는 경우가 많고(참여자 수), 폼에서는 max만 다루는 게 일반적입니다.
 */
export type Capacity = {
  current: number;
  max: number;
};

export type CapacityInput = {
  max: number;
  /**
   * 일부 API가 current를 요구/허용하는 경우(예: 호스트 포함 초기값) 대비.
   * 서버가 무시하더라도 타입 레벨에서 막지 않도록 optional로 둡니다.
   */
  current?: number;
};

// 4. 게시글
export interface Post {
  id: number;
  category: PostCategory;
  title: string;
  content: string;
  writerId: string;
  writerNickname: string;
  writerImageUrl?: string;

  /**
   * 기존 모델은 ISODateString으로 되어 있지만 실제로는 DateTime 문자열이 내려올 수 있어
   * 도메인별로 ISODateTimeString을 쓰더라도 여기서는 string alias라 충돌 없이 공존합니다.
   */
  meetingTime: ISODateString;

  locationName: string;
  longitude: number;
  latitude: number;

  currentCount: number;
  capacity: number;

  state: PostState;
  joinMode: JoinMode;
  lastModified: ISODateString;
  myParticipationStatus: MyParticipationStatus;
}

// 5. 기타
export interface Applicant {
  postId: number;
  userId: string;
  state: ApplicantState;
}

export interface ChatRoom {
  roomId: number;
  opponentId: string;
  opponentNickname: string;
  opponentProfileImageUrl?: string;
  postId: number;
  unReadCount: number;
  lastMessageContent: string;
}

export interface Message {
  messageId: number;
  roomId: number;
  postId: number;
  postTitle: string;
  senderId: string;
  content: string;
}