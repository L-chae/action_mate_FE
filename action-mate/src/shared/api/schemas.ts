// src/shared/api/schemas.ts
// OpenAPI(제공된 명세) 기반의 최소 TS 스키마 타입 모음.
// - "서버 응답 Raw"는 여기 타입을 기준으로 받고
// - UI에서 쓸 타입은 feature/shared model types로 정리 후 mapper로 변환합니다.

export type ErrorResponse = {
  code: string;
  message: string;
};

export type LoginRequest = {
  id: string;
  password: string;
};

export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
};

export type SignupRequest = {
  id: string;
  password: string;
  birth?: string; // date
  gender?: "남" | "여";
};

export type ExistsResponse = {
  exists: boolean;
};

// /users/{userId}/profile 응답
export type ApiUserProfileResponse = {
  id: string;
  nickname?: string;
  profileImageUrl?: string;
  birth?: string; // date
  gender?: "남" | "여";
  avgRate: number;
  orgTime: number;
};

// /posts POST
export type PostCreateRequest = {
  category: "운동" | "오락" | "식사" | "자유";
  title: string;
  content: string;
  meetingTime: string; // date-time
  locationName?: string;
  longitude: number;
  latitude: number;
  capacity?: number;
  joinMode: "INSTANT" | "APPROVAL";
};

// /posts/id/{postId} PUT
export type PostUpdateRequest = Partial<PostCreateRequest> & {
  state?: "OPEN" | "STARTED" | "ENDED" | "FULL" | "CANCELED";
};

// /message POST (채팅방 없거나 모를 때)
export type EnsureRoomAndSendMessageRequest = {
  postId: number;
  receiverId: string;
  content: string;
};

// /message/room 목록 아이템
export type MessageRoomResponse = {
  roomId: number;
  opponentId: string;
  opponentNickname: string;
  opponentProfileImageUrl?: string;
  postId: number;
  unReadCount: number;
  lastMessageContent: string;
};

// /message/room/{roomId} 목록 아이템
export type ApiMessage = {
  messageId: number;
  roomId: number;
  postId: number;
  postTitle: string;
  senderId: string;
  content: string;
};

// Applicant
export type ApiApplicant = {
  postId: number;
  userId: string;
  state: "APPROVED" | "REJECTED" | "PENDING";
};

// Report
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
  createdAt: string; // date-time
};

// Rating
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
  createdAt: string; // date-time
};