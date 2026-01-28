// ============================================================================
// src/features/meetings/model/dto.ts
// ============================================================================
/**
 * ✅ Meetings(Remote) DTO (OpenAPI 기반)
 * - 백엔드 스키마가 바뀌면 여기만 수정하도록 분리
 * - nullable/optional 변동을 방어적으로 수용 (UI는 mapper에서 정규화)
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

  writerId?: string | null;
  writerNickname?: string | null;
  writerImageUrl?: string | null;

  meetingTime: string; // date-time

  locationName?: string | null;
  longitude?: number | null;
  latitude?: number | null;

  currentCount?: number | null;
  capacity?: number | null;

  state: PostStateDTO;
  joinMode: JoinModeDTO;

  lastModified?: string | null;
  myParticipationStatus?: MyParticipationStatusDTO | null;
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

  /**
   * OpenAPI에 update enum이 좁게 정의된 케이스가 있어 유지
   * - 서버가 확장되면 PostStateDTO로 통일 권장
   */
  state: "OPEN" | "STARTED" | "ENDED";
  joinMode: JoinModeDTO;
}>;

export type ApplicantStatusDTO = "HOST" | "MEMBER" | "REJECTED" | "PENDING";

export type ApplicantDTO = {
  postId: number;
  userId: string;
  state: ApplicantStatusDTO;
};

export type RatingRequestDTO = {
  targetUserId: string;
  score: number; // 1~5
  comment?: string;
};