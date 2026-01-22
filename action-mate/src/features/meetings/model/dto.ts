// 백엔드 명세 v1.1.14 기준
export type PostStateDTO = "OPEN" | "FULL" | "CANCELED" | "STARTED" | "ENDED";
export type JoinModeDTO = "APPROVAL" | "INSTANT";
export type ApplicantStateDTO = "PENDING" | "APPROVED" | "REJECTED";

// GET /posts 응답 (게시글)
export type MeetingPostDTO = {
  id: number;
  category: string;
  title: string;
  content: string;
  meetingTime: string; // ISO String
  
  locationName: string; 
  latitude: number;
  longitude: number;
  
  capacity: number; // 백엔드는 총원만 줌
  state: PostStateDTO;
  joinMode: JoinModeDTO;
  
  // (확인필요) 호스트 정보가 없다면 ID만 올 수 있음
  hostId?: string; 
};

// GET /posts/{id}/applicants 응답 (참여자)
export type ApplicantDTO = {
  postId: number;
  userId: string;
  state: ApplicantStateDTO;
  // 백엔드 명세상 닉네임/프사가 없지만, 있다고 가정하거나 별도 조회 필요
  // 여기서는 DTO에 없더라도 Mapper에서 가짜 데이터를 채울 예정
};