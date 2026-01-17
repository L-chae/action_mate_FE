// ✅ UI의 CategoryChips와 키값 일치
export type CategoryKey = "SPORTS" | "GAMES" | "MEAL" | "STUDY" | "ETC";

// ✅ [추가됨] 홈 화면 정렬 옵션 (meetingService.ts에서 이동)
export type HomeSort = "LATEST" | "NEAR" | "SOON";

export type JoinMode = "INSTANT" | "APPROVAL";
export type PostStatus = "OPEN" | "FULL" | "CANCELED" | "STARTED" | "ENDED";

// "JOINED" -> "MEMBER"로 변경, "HOST" 추가
export type MembershipStatus = "NONE" | "MEMBER" | "PENDING" | "HOST" | "CANCELED";

// 호스트 정보
export type HostSummary = {
  id: string;
  nickname: string;
  avatarUrl?: string;
  mannerTemp: number;
  kudosCount: number;
  intro?: string;
};

// 내 참여 상태
export type MyState = {
  membershipStatus: MembershipStatus;
  canJoin: boolean;
  reason?: string;
};

export type MeetingPost = {
  id: string;
  category: CategoryKey;
  title: string;
  
  // 본문 내용
  content?: string; 

  // --- 🕒 시간 관련 ---
  meetingTimeText: string;
  meetingTime?: string;
  durationHours?: number;
  durationMinutes?: number;

  // --- 📍 위치 관련 ---
  locationText: string;
  locationLat?: number;
  locationLng?: number;
  distanceText?: string;

  // --- 👥 인원 ---
  capacityJoined: number;
  capacityTotal: number;

  // --- ⚙️ 설정 ---
  joinMode: JoinMode;
  conditions?: string;
  status: PostStatus;

  // --- 📝 기타 ---
  memoUpdatedAtText?: string;
  items?: string;

  // --- 🔗 관계 데이터 ---
  host?: HostSummary;
  myState?: MyState; 
};

export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  authorNickname: string;
  authorAvatarUrl?: string;
  content: string;
  createdAt: string;
};