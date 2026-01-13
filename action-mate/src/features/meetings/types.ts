// 기획안 기반 최소 타입 (MVP)

export type CategoryKey = "SPORTS" | "GAMES" | "MEAL" | "ETC";

export type JoinMode = "INSTANT" | "APPROVAL";

export type PostStatus = "OPEN" | "FULL" | "CANCELED" | "STARTED" | "ENDED";

export type MembershipStatus = "NONE" | "JOINED" | "PENDING" | "CANCELED";

export type Category = {
  id: CategoryKey;
  name: string;
  icon: string; // "🏸" 같은 이모지 키로 일단 사용
};

export type HostSummary = {
  userId: string;
  nickname: string;
  kudosCount?: number;
};

export type MyState = {
  membershipStatus: MembershipStatus;
  canJoin: boolean;
  reason?: string; // 정원마감/취소/차단 등
};

export type MeetingPost = {
  id: string;
  category: Category;
  title: string;
  content?: string;

  meetingTimeText: string;  // "오늘 19:00" (MVP: string)
  durationHours: number;    // 기본 2

  locationText: string;
  lat?: number;
  lng?: number;
  distanceText?: string;    // "0.6km"

  capacityJoined: number;
  capacityTotal: number;

  joinMode: JoinMode;
  status: PostStatus;

  hostMemo?: string;
  memoUpdatedAtText?: string;

  host: HostSummary;

  myState?: MyState;
};
