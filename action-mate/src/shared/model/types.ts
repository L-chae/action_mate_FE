// src/shared/model/types.ts

/**
 * 이 파일은 "UI에서 안정적으로 쓰는 타입(UI Model)"을 기준으로 둡니다.
 * - 백엔드 Raw(서버응답) -> UI(표준화/기본값/Id정규화) 변환은 mapper에서 1회만 수행하는 것을 권장합니다.
 */

// 1) 기본 Alias (런타임 변환 강제 없이 의미만 부여)
export type ISODateString = string; // YYYY-MM-DD
export type ISODateTimeString = string; // YYYY-MM-DDTHH:mm:ss...

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

// 2) 공통 Enum (UI 편의: Gender는 영문 유지)
export type Gender = "male" | "female";

/**
 * ✅ 백엔드 명세 기준 성별
 * - OpenAPI: M/F
 */
export type ServerGender = "M" | "F";

export type PostCategory = "운동" | "오락" | "식사" | "자유";
export type PostState = "OPEN" | "STARTED" | "ENDED" | "FULL" | "CANCELED";
export type JoinMode = "INSTANT" | "APPROVAL";

/**
 * ✅ 신청/참여 상태 (명세 기준)
 * - Applicant.state: HOST|MEMBER|REJECTED|PENDING|NONE
 */
export type ApplicantState = "HOST" | "MEMBER" | "REJECTED" | "PENDING" | "NONE";

/**
 * ✅ 내 참여 상태 (명세 기준)
 * - Post.myParticipationStatus: HOST|MEMBER|PENDING|REJECTED|NONE
 */
export type MyParticipationStatus = "HOST" | "MEMBER" | "PENDING" | "REJECTED" | "NONE";

// 3) 유저 관련

/**
 * ✅ 서버 Raw 유저 요약 (서버 불안정/타입 혼재 대응)
 * - 다양한 키를 mapper에서 흡수할 수 있도록 최소 필드만 유지
 */
export type UserSummaryRaw = {
  id: Id;
  nickname?: string | null;
  // 서버가 imageName / imageUrl 등 다양한 형태로 줄 수 있음
  avatarUrl?: string | null;
  profileImageName?: string | null;
  profileImageUrl?: string | null;
};

/**
 * ✅ UI 유저 요약 (id는 문자열로 정규화된 상태)
 */
export type UserSummary = {
  id: NormalizedId;
  nickname: string;
  avatarUrl?: string | null; // UI에서 바로 쓸 수 있는 URL(가능하면)
  avatarImageName?: string | null; // 서버 파일명(필요 시)
};

/**
 * ✅ UserReputation
 */
export type UserReputation = {
  avgRate: number;
  orgTime: number;
};

/**
 * ✅ 백엔드 프로필 응답(raw) (OpenAPI: /users/{userId}/profile)
 * - id/avgRate/orgTime 필수, 나머지 optional
 * - profileImageName 사용
 * - gender: M/F
 */
export interface ServerProfile {
  id: string;
  nickname?: string;
  profileImageName?: string;
  birth?: string; // date
  gender?: ServerGender;
  avgRate: number;
  orgTime: number;
}

/**
 * ✅ 프론트 내부에서 쓸 유저 프로필(UI)
 * - gender는 영문으로 표준화
 * - imageName + imageUrl 둘 다 들고 있으면 화면/캐시/업로드 흐름이 단순해짐
 */
export interface UserProfile {
  id: NormalizedId;
  nickname: string;
  profileImageName?: string | null;
  profileImageUrl?: string | null;
  birth?: ISODateString | null;
  gender: Gender;
  avgRate: number;
  orgTime: number;
}

/**
 * ✅ Location (UI 기준)
 * - 백엔드 명세는 locationName + 위경도이므로 UI는 최소로 맞춥니다.
 */
export type Location = {
  name: string;
  latitude: number | null;
  longitude: number | null;
  address?: string | null;
};

/**
 * ✅ Location Raw (서버 응답 다양성 수용)
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
 * ✅ Capacity (UI 기준)
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
 */
export type CapacityRaw = Partial<{
  current: number;
  max: number;
  total: number;
}>;

// 4) 게시글 (UI Model)
export interface Post {
  id: NormalizedId;

  category: PostCategory;
  title: string;
  content: string;

  writerId: NormalizedId;
  writerNickname: string;
  writerImageName?: string | null;
  writerImageUrl?: string | null;

  meetingTime: ISODateTimeString;

  locationName: string;
  longitude: number | null;
  latitude: number | null;

  currentCount: number;
  capacity: number;

  state: PostState;
  joinMode: JoinMode;
  lastModified: ISODateTimeString;

  myParticipationStatus: MyParticipationStatus;
}

// 5) 기타 (UI Model)
export interface Applicant {
  postId: NormalizedId;
  userId: NormalizedId;
  state: ApplicantState;
}

export interface ChatRoom {
  roomId: number;
  opponentId: NormalizedId;
  opponentNickname: string;
  opponentProfileImageName?: string | null;
  opponentProfileImageUrl?: string | null;
  postId: NormalizedId;
  unReadCount: number;
  lastMessageContent: string;
}

export interface Message {
  messageId: number;
  roomId: number;
  postId: NormalizedId;
  postTitle: string;
  senderId: NormalizedId;
  content: string;
}

// 3줄 요약
// - 백엔드 명세(M/F, profileImageName, Applicant/Participation enum)를 UI Model에 반영했습니다.
// - UI에서 안전하게 쓰도록 id는 NormalizedId(string)로 통일하고, 이미지 name/url를 함께 담도록 확장했습니다.
// - meetingTime/lastModified는 date-time(ISODateTimeString)로 정정했습니다.