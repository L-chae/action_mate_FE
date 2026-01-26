// src/shared/api/schemas.ts
// OpenAPI(제공된 명세 v1.2.4) 기반의 TS 스키마 타입 모음.

export type ErrorResponse = {
  code: string;
  message: string;
};

// -----------------------------
// Auth
// -----------------------------

export type LoginRequest = {
  id: string;
  password: string;
};

export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
};

// -----------------------------
// User
// -----------------------------

export type SignupRequest = {
  id: string;
  password: string;
  birth?: string; // date (YYYY-MM-DD)
  gender?: "M" | "F";
  nickname?: string;
};

export type ExistsResponse = {
  exists: boolean;
};

export type UserProfile = {
  id: string;
  nickname?: string;
  profileImageName?: string;
  birth?: string; // date (YYYY-MM-DD)
  gender?: "M" | "F";
  avgRate: number;
  orgTime: number;
};

// -----------------------------
// Images
// -----------------------------

export type GetImageParams = {
  filename: string;
};

export type ImageBinaryResponse = ArrayBuffer;

// -----------------------------
// Post
// -----------------------------

export type PostCategory = "운동" | "오락" | "식사" | "자유";
export type JoinMode = "INSTANT" | "APPROVAL";
export type PostState = "OPEN" | "STARTED" | "ENDED" | "FULL" | "CANCELED";
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

// -----------------------------
// Message
// -----------------------------

export type MessageRoomResponse = {
  roomId: number;
  opponentId: string;
  opponentNickname: string;
  opponentProfileImageName?: string;
  postId: number;
  unReadCount: number;
  lastMessageContent: string;
};

export type Message = {
  messageId: number;
  roomId: number;
  postId: number;
  postTitle: string;
  senderId: string;
  content: string;
};

export type EnsureRoomAndSendMessageRequest = {
  postId: number;
  receiverId: string;
  content: string;
};

export type SendMessageRequest = {
  roomId: number;
  content: string;
};

export type SendChatToRoomRequest = string; // text/plain

// -----------------------------
// Applicant
// -----------------------------

export type ApplicantState = "HOST" | "MEMBER" | "REJECTED" | "PENDING" | "NONE";

export type Applicant = {
  postId: number;
  userId: string;
  state: ApplicantState;
};

export type DecideApplicantRequest = "APPROVED" | "REJECTED";

// -----------------------------
// Report
// -----------------------------

export type ReportCreateRequest = {
  targetUserId: string;
  postId: number;
  description: string;
};

export type Report = {
  id: number;
  reporterId: string;
  targetId: string;
  postId: number;
  description: string;
  createdAt: string; // date-time
};

// -----------------------------
// Rating
// -----------------------------

export type RatingRequest = {
  targetUserId: string;
  score: number; // 1~5
  comment?: string;
};

export type Rating = {
  id: number;
  postId: number;
  raterId: string;
  targetUserId: string;
  score: number;
  comment?: string;
  createdAt: string; // date-time
};

// -----------------------------
// Endpoint Response Helpers
// -----------------------------

export type LoginResponse = TokenResponse;
export type RefreshResponse = TokenResponse;

export type SignupResponse = void; // 201 (본문 없음)
export type CheckUserExistsResponse = ExistsResponse;
export type GetUserProfileResponse = UserProfile;

export type ListPostsByCategoryResponse = Post[];
export type GetPostsResponse = Post; // 명세 기준
export type CreatePostResponse = Post;

export type ListPostsHotResponse = Post[];
export type GetPostResponse = Post;
export type UpdatePostResponse = Post;
export type DeletePostResponse = void; // 204
export type ListPostsNearbyResponse = Post[];

export type ShowMessageRoomListResponse = MessageRoomResponse; // 명세 기준
export type ShowMessagesWithRoomResponse = Message[];
export type SendChatToRoomResponse = Message;
export type SendMessageResponse = Message;

export type ApplyToPostResponse = Applicant;
export type ListApplicantsResponse = Applicant[];
export type CancelApplyResponse = void; // 200 (본문 없음)
export type DecideApplicantResponse = Applicant;

export type CreateReportResponse = Report;
export type RateMemberResponse = Rating;

/*
요약:
1) v1.2.4 반영: SignupRequest.gender를 "M"|"F"로 확정.
2) 불필요한 union/방어 타입 제거하고 명세 스키마 그대로 정리.
3) 이미지 관련 값은 모두 *ImageName(파일명) 형태로 유지.
*/