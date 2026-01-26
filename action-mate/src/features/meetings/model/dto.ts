// src/features/meetings/model/dto.ts
/**
 * ✅ Meetings(Remote) DTO (OpenAPI v1.2.4 기반)
 * - 백엔드 스키마가 바뀌면 여기만 수정하도록 분리
 */

export type PostCategoryDTO = "운동" | "오락" | "식사" | "자유";
export type PostStateDTO = "OPEN" | "STARTED" | "ENDED" | "FULL" | "CANCELED";
export type JoinModeDTO = "INSTANT" | "APPROVAL";
export type MyParticipationStatusDTO = "HOST" | "MEMBER" | "PENDING" | "REJECTED" | "NONE";

export type MeetingPostDTO = {
  id: number;
  category: PostCategoryDTO;
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

  state: PostStateDTO;
  joinMode: JoinModeDTO;

  lastModified: string; // 명세 required
  myParticipationStatus?: MyParticipationStatusDTO;
};

export type PostCreateRequestDTO = {
  category: PostCategoryDTO;
  title: string;
  content: string;
  meetingTime: string; // date-time

  locationName?: string;
  longitude: number;
  latitude: number;

  capacity?: number;
  joinMode: JoinModeDTO;
};

export type PostUpdateRequestDTO = {
  category?: PostCategoryDTO;
  title?: string;
  content?: string;
  meetingTime?: string; // date-time

  locationName?: string;
  longitude?: number;
  latitude?: number;

  capacity?: number;
  state?: "OPEN" | "STARTED" | "ENDED"; // OpenAPI에 update enum이 좁게 정의됨
  joinMode?: JoinModeDTO;
};

export type ApplicantDTO = {
  postId: number;
  userId: string;
  state: "HOST" | "MEMBER" | "REJECTED" | "PENDING" | "NONE";
};

export type RatingRequestDTO = {
  targetUserId: string;
  score: number; // 1~5
  comment?: string;
};

/*
요약:
1) writerImageUrl -> writerImageName, myParticipationStatus에 REJECTED 추가.
2) MeetingPostDTO.lastModified를 명세(required)로 고정.
3) ApplicantDTO.state를 v1.2.4(HOST/MEMBER/REJECTED/PENDING/NONE)로 정합.
*/