// src/shared/api/schemas.ts
// Backend Truth(제공된 서버 코드/정리) 기준의 최소 TS 스키마 타입 모음.
// - 서버 응답이 ResponseEntity<?>인 케이스가 있어, UI단에서는 런타임 가드를 권장합니다(여기서는 타입만 확정).

export type ErrorResponse = {
  code: string;
  message: string;
};

// -------------------------
// Auth
// -------------------------
export type LoginRequest = {
  id: string;
  password: string;
};

export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
};

// -------------------------
// Users / Profile
// -------------------------
export type Gender = "F" | "M";

export type SignupRequest = {
  id: string;
  password: string;
  gender: Gender;
  birth: string; // YYYY-MM-DD (ISO LocalDate)
  nickname: string;
};

// /users/exists 는 서버에서 boolean을 바로 반환(명세상 true=사용가능, false=사용불가)
export type ExistsResponse = boolean;

// ProfileRequest (확정)
export type ProfileRequest = {
  nickname: string;
  gender: Gender;
  birth: string; // YYYY-MM-DD
  profile: string; // 서버는 실제로 user.profileImage 등을 넣어 내려줄 수 있음
  userId: string;
};

// -------------------------
// Applicants
// -------------------------
export type ApplicantStatus = "HOST" | "MEMBER" | "REJECTED" | "PENDING";

// ApplicantResponse (확정)
export type ApplicantResponse = {
  postId: number;
  userId: string;
  state: ApplicantStatus;
};

// 상태 변경(PATCH) body는 반드시 JSON string: "MEMBER" | "REJECTED"
export type DecideApplicantRequest = "MEMBER" | "REJECTED";

// -------------------------
// Messages
// -------------------------
export type MessageResponse = {
  messageId: number;
  roomId: number;
  postId: number;
  senderId: string;
  content: string;
  title: string;
};

export type MessageRoomResponse = {
  roomId: number;
  opponentId: string;
  postId: number;
  lastMessage: string;
  title: string;
  notReadCount: number;
  opponentNickname: string;
  opponentProfileImage: string;
};

export type EnsureRoomAndSendMessageRequest = {
  postId: number;
  receiverId: string;
  content: string;
};

// -------------------------
// Posts (기존 사용처 호환용: 값 고정 유지)
// -------------------------
export type PostStatus = "OPEN" | "STARTED" | "ENDED" | "FULL" | "CANCELED" | string;
export type JoinMode = "INSTANT" | "APPROVAL" | string;

// -------------------------
// Reports / Ratings (기존 사용처 유지)
// -------------------------
export type ReportCreateRequest = {
  targetUserId: string;
  postId: number;
  description: string;
};

export type ReportResponse = {
  id: number;
  reporterId: string;
  targetId: string;
  postId: number;
  description: string;
  createdAt: string;
};

export type RatingRequest = {
  targetUserId: string;
  score: number; // 1~5
  comment?: string;
};

export type RatingResponse = {
  id: number;
  postId: number;
  raterId: string;
  targetUserId: string;
  score: number;
  comment?: string;
  createdAt: string;
};

// 요약(3줄)
// - ApplicantStatus/ApplicantResponse/ProfileRequest/Message DTO를 서버 확정 스키마로 교체 및 값 고정(대문자) 유지.
// - DecideApplicantRequest는 PATCH body 규격에 맞게 "MEMBER"|"REJECTED"로 수정.
// - ResponseEntity<?> 변동 가능 구간은 타입은 확정하되, 실제 사용처에서 런타임 가드를 전제로 설계.