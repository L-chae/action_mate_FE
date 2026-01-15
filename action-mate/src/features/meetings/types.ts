// ✅ UI의 CategoryChips와 키값 일치
export type CategoryKey = "SPORTS" | "GAMES" | "MEAL" | "STUDY" | "ETC";

export type JoinMode = "INSTANT" | "APPROVAL";
export type PostStatus = "OPEN" | "FULL" | "CANCELED" | "STARTED" | "ENDED";

// ✅ 수정됨: "JOINED" -> "MEMBER"로 변경, "HOST" 추가
// (서비스 로직과 UI 분기 처리를 위해 구체화)
export type MembershipStatus = "NONE" | "MEMBER" | "PENDING" | "HOST" | "CANCELED";

// ✅ 호스트 정보 (상세 화면 & 프로필 모달용)
export type HostSummary = {
  id: string;
  nickname: string;
  avatarUrl?: string; // 프로필 이미지 (없으면 기본 아이콘)
  mannerTemp: number; // 매너 온도 (기본 36.5)
  kudosCount: number; // 받은 칭찬 수
  intro?: string;     // 한줄 소개
};

// 내 참여 상태 (MVP 핵심)
export type MyState = {
  membershipStatus: MembershipStatus;
  canJoin: boolean;
  reason?: string; // "정원마감", "이미 참여함", "차단됨" 등
};

export type MeetingPost = {
  id: string;

  // ✅ MVP: 객체 대신 Key string만 사용 (가벼움)
  category: CategoryKey;

  title: string;
  
  // ✅ 본문 내용 (모임 소개)
  content?: string; 

  // --- 🕒 시간 관련 ---
  meetingTimeText: string;  // "오늘 19:00" (리스트 표시용)
  meetingTime?: string;     // 🆕 ISO Date String (수정 화면에서 날짜 복원용)
  durationHours?: number;   // "2시간" (대략적 표시)
  durationMinutes?: number; // 🆕 "120분" (정확한 계산용)

  // --- 📍 위치 관련 ---
  locationText: string;     // "잠원지구 3주차장"
  locationLat?: number;     // 🆕 lat -> locationLat (Service와 이름 통일)
  locationLng?: number;     // 🆕 lng -> locationLng (Service와 이름 통일)
  distanceText?: string;    // "0.6km"

  // --- 👥 인원 ---
  capacityJoined: number;
  capacityTotal: number;

  // --- ⚙️ 설정 ---
  joinMode: JoinMode;
  conditions?: string;      // 🆕 승인 조건 텍스트
  status: PostStatus;

  // --- 📝 메모/기타 ---
  memoUpdatedAtText?: string;
  items?: string;           // 준비물 (선택)

  // --- 🔗 관계 데이터 ---
  // 상세 화면에서 사용할 호스트 정보 (리스트에선 없을 수도 있음 -> Optional)
  host?: HostSummary;
  
  // 로그인 유저와의 관계
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