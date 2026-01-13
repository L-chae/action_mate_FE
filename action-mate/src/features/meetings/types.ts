// ✅ UI의 CategoryChips와 키값 일치 ("STUDY" 추가)
export type CategoryKey = "SPORTS" | "GAMES" | "MEAL" | "STUDY" | "ETC";

export type JoinMode = "INSTANT" | "APPROVAL";
export type PostStatus = "OPEN" | "FULL" | "CANCELED" | "STARTED" | "ENDED";
export type MembershipStatus = "NONE" | "JOINED" | "PENDING" | "CANCELED";

// 호스트 정보 (리스트에서는 닉네임 정도만 필요하거나, 아예 없어도 됨)
export type HostSummary = {
  userId: string;
  nickname: string;
  kudosCount?: number; // 칭찬 횟수
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
  // 아이콘/이름은 프론트엔드 상수(CATEGORIES)에서 매핑
  category: CategoryKey; 
  
  title: string;
  content?: string;

  meetingTimeText: string;  // "오늘 19:00"
  durationHours?: number;   // 기본 2

  locationText: string;     // "잠원지구 3주차장"
  lat?: number;
  lng?: number;
  distanceText?: string;    // "0.6km"

  // ✅ UI 코드(MeetingCard)와 변수명 통일
  capacityJoined: number;
  capacityTotal: number;

  joinMode: JoinMode;
  status: PostStatus;

  hostMemo?: string;        // "라켓 빌려드려요"
  memoUpdatedAtText?: string;

  host?: HostSummary;       // 상세 화면용 (리스트에선 Optional)
  myState?: MyState;        // 로그인 유저와의 관계
};