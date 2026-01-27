//////////////////// src/shared/api/schemas.ts
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

export type UserGender = "M" | "F";

export type SignupRequest = {
  id: string;
  password: string;
  birth?: string; // date (YYYY-MM-DD)
  gender?: UserGender; // M/F
  nickname?: string;
};

export type ExistsResponse = {
  exists: boolean;
};

// /users/{userId}/profile 응답
export type ApiUserProfileResponse = {
  id: string;
  nickname?: string;
  profileImageName?: string; // e.g. xxx.png
  birth?: string; // date
  gender?: UserGender; // M/F
  avgRate: number;
  orgTime: number;
};

export type PostCategory = "운동" | "오락" | "식사" | "자유";

export type PostState = "OPEN" | "STARTED" | "ENDED" | "FULL" | "CANCELED";

export type JoinMode = "INSTANT" | "APPROVAL";

export type MyParticipationStatus = "HOST" | "MEMBER" | "PENDING" | "REJECTED" | "NONE";

export type Post = {
  id: number;
  category: PostCategory;
  title: string;
  content: string;

  writerId?: string;
  writerNickname?: string;
  writerImageName?: string;

  meetingTime: string; // date-time
  locationName?: string;
  longitude: number;
  latitude: number;

  currentCount?: number;
  capacity?: number;

  state: PostState;
  joinMode: JoinMode;

  lastModified: string; // date-time
  myParticipationStatus?: MyParticipationStatus;
};

// /posts POST
export type PostCreateRequest = {
  category: PostCategory;
  title: string;
  content: string;
  meetingTime: string; // date-time
  locationName?: string;
  longitude: number;
  latitude: number;
  capacity?: number;
  joinMode: JoinMode;
};

// /posts/id/{postId} PUT
export type PostUpdateRequest = {
  category?: PostCategory;
  title?: string;
  content?: string;
  meetingTime?: string; // date-time
  locationName?: string;
  longitude?: number;
  latitude?: number;
  capacity?: number;
  state?: "OPEN" | "STARTED" | "ENDED";
  joinMode?: JoinMode;
};

// /message POST (채팅방 없거나 모를 때)
export type EnsureRoomAndSendMessageRequest = {
  postId: number;
  receiverId: string;
  content: string;
};

// /message/room/{roomId} POST (채팅방 id 알고 있을 때) - requestBody: text/plain
export type SendChatToRoomBody = string;

// /posts/{postId}/applicants/{userId} PATCH 요청 바디
export type DecideApplicantRequest = "APPROVED" | "REJECTED";

// /message/room 목록 응답 스키마(명세 기준: 단일 객체 형태)
export type MessageRoomResponse = {
  roomId: number;
  opponentId: string;
  opponentNickname: string;
  opponentProfileImageName?: string;
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

// Applicant (명세의 enum 기준)
export type ApiApplicant = {
  postId: number;
  userId: string;
  state: "HOST" | "MEMBER" | "REJECTED" | "PENDING" | "NONE";
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