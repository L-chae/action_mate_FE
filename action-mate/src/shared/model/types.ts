// src/shared/model/types.ts

/**
 * 이 파일은 "UI에서 안정적으로 쓰는 타입(UI Model)"을 기준으로 둡니다.
 * - 백엔드가 불안정/느린 경우: API 레이어에서 Raw(서버응답) -> UI(표준화/기본값/Id정규화)로 한 번만 정리한 뒤
 *   화면에서는 UI Model만 쓰는 방식이 유지보수에 가장 안전합니다.
 */

// 1) 기본 Alias (런타임 변환 강제 없이 의미만 부여)
export type ISODateString = string;
export type ISODateTimeString = string;

/**
 * ✅ 서버/DB 원본 Id (불안정 서버 대비)
 * - 서버가 number/string을 섞어 내려줄 수 있으니 Raw 모델은 이 타입을 사용
 */
export type Id = string | number;

/**
 * ✅ UI 표준 Id (정규화된 Id)
 * - 화면/상태관리/캐시 키에서 혼란을 줄이려면 "문자열"로 통일하는 게 안전합니다.
 */
export type NormalizedId = string;

/**
 * ✅ Id 표준화 함수
 * - API 레이어에서 Raw -> UI 변환 시 사용 권장
 */
export const normalizeId = (id: Id): NormalizedId => String(id);

/**
 * ✅ 실무에서 자주 쓰는 유틸 타입
 */
export type Maybe<T> = T | null | undefined;

// 2) 공통 Enum (프론트 편의를 위해 Gender는 영문 유지)
export type Gender = "male" | "female";

export type PostCategory = "운동" | "오락" | "식사" | "자유";
export type PostState = "OPEN" | "STARTED" | "ENDED" | "FULL" | "CANCELED";
export type JoinMode = "INSTANT" | "APPROVAL";
export type ApplicantState = "APPROVED" | "REJECTED" | "PENDING";
export type MyParticipationStatus = "HOST" | "MEMBER" | "PENDING" | "NONE";

// 3) 유저 관련

/**
 * ✅ 서버 Raw 유저 요약 (서버 불안정/타입 혼재 대응)
 */
export type UserSummaryRaw = {
  id: Id;
  nickname: string;
  avatarUrl?: string | null;
};

/**
 * ✅ UI 유저 요약 (id는 문자열로 정규화된 상태)
 * - 화면/상태관리/캐시 키에서 안정적으로 사용 가능
 */
export type UserSummary = {
  id: NormalizedId;
  nickname: string;
  avatarUrl?: string | null;
};

/**
 * ✅ UserReputation
 */
export type UserReputation = {
  avgRate: number;
  orgTime: number;
};

// 백엔드에서 내려오는 원본 프로필 타입 (변환 전)
export type ServerGender = "남" | "여";

export interface ServerProfile {
  id: string;
  nickname: string;
  profileImageUrl?: string;
  birth: string;
  gender: ServerGender; // 서버는 한글
  avgRate: number;
  orgTime: number;
}

// 프론트 내부에서 쓸 유저 객체 (변환 후)
export interface UserProfile {
  id: string;
  nickname: string;
  profileImageUrl?: string;
  birth: string;
  gender: Gender; // 프론트는 영문
  avgRate: number;
  orgTime: number;
}

/**
 * ✅ Location (UI 기준)
 * - 불안정한 서버에서 좌표가 없을 수도 있으므로 null 허용(기본값 규칙에 의한 안정화 가능)
 * - 지도 기능이 꼭 필요하면 API 레이어에서 null 여부를 먼저 검사하는 흐름이 안전합니다.
 */
export type Location = {
  name: string;
  latitude: number | null;
  longitude: number | null;
  address?: string | null;
};

/**
 * ✅ Location Raw (서버 응답 다양성 수용)
 * - 일부 서버는 lat/lng, 일부는 latitude/longitude 등 다양한 키를 사용
 */
export type LocationRaw = Partial<{
  name: string;
  latitude: number;
  longitude: number;
  lat: number;
  lng: number;
  address: string | null;
}>;

/**
 * ✅ Capacity (UI 기준, current/max는 기본값(0)으로라도 항상 존재하도록 정리 권장)
 */
export type Capacity = {
  current: number;
  max: number;
};

/**
 * ✅ CapacityInput (요청/폼 전송 기준)
 */
export type CapacityInput = {
  max: number;
  current?: number;
};

/**
 * ✅ Capacity Raw (서버 응답 다양성 수용)
 * - max 대신 total을 주는 서버 대응
 */
export type CapacityRaw = Partial<{
  current: number;
  max: number;
  total: number;
}>;

// 4) 게시글 (기존 유지)
export interface Post {
  id: number;
  category: PostCategory;
  title: string;
  content: string;
  writerId: string;
  writerNickname: string;
  writerImageUrl?: string;

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

// 5) 기타 (기존 유지)
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