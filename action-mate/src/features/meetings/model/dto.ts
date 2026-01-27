// src/features/meetings/model/dto.ts
/**
 * ✅ Meetings(Remote) DTO (OpenAPI 기반)
 * - 백엔드 스키마가 바뀌면 여기만 수정하도록 분리
 */

export type PostCategoryDTO = "운동" | "오락" | "식사" | "자유";
export type PostStateDTO = "OPEN" | "STARTED" | "ENDED" | "FULL" | "CANCELED";
export type JoinModeDTO = "INSTANT" | "APPROVAL";
export type MyParticipationStatusDTO = "HOST" | "MEMBER" | "PENDING" | "NONE";

export type MeetingPostDTO = {
  id: number;
  category: PostCategoryDTO;
  title: string;
  content: string;

  writerId?: string;
  writerNickname?: string;
  writerImageUrl?: string;

  meetingTime: string; // date-time
  locationName?: string;
  longitude: number;
  latitude: number;

  currentCount?: number;
  capacity?: number;

  state: PostStateDTO;
  joinMode: JoinModeDTO;

  lastModified?: string;
  myParticipationStatus?: MyParticipationStatusDTO;
};

export type PostCreateRequestDTO = {
  category: PostCategoryDTO;
  title: string;
  content: string;
  meetingTime: string;

  locationName?: string;
  longitude: number;
  latitude: number;

  capacity?: number;
  joinMode: JoinModeDTO;
};

export type PostUpdateRequestDTO = Partial<{
  category: PostCategoryDTO;
  title: string;
  content: string;
  meetingTime: string;

  locationName: string;
  longitude: number;
  latitude: number;

  capacity: number;
  state: "OPEN" | "STARTED" | "ENDED"; // OpenAPI에 update enum이 좁게 정의됨
  joinMode: JoinModeDTO;
}>;

export type ApplicantDTO = {
  postId: number;
  userId: string;
  state: "APPROVED" | "REJECTED" | "PENDING";
};

export type RatingRequestDTO = {
  targetUserId: string;
  score: number; // 1~5
  comment?: string;
};