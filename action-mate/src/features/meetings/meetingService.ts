import type {
  Category,
  CategoryKey,
  MeetingPost,
  MembershipStatus,
  PostStatus,
} from "./types";

// ✅ 카테고리 정의
export const CATEGORIES: Record<CategoryKey, Category> = {
  SPORTS: { id: "SPORTS", name: "운동", icon: "🏃" },
  GAMES: { id: "GAMES", name: "오락", icon: "🎮" },
  MEAL: { id: "MEAL", name: "식사", icon: "🍜" },
  ETC: { id: "ETC", name: "기타", icon: "✨" },
};

// ✅ 목데이터
let MOCK: MeetingPost[] = [
  {
    id: "1",
    category: CATEGORIES.SPORTS,
    title: "🏸 배드민턴 2게임만",
    content: "가볍게 2게임! 초보도 환영",
    meetingTimeText: "오늘 19:00",
    durationHours: 2,
    locationText: "강남역 3번 출구",
    distanceText: "0.6km",
    capacityJoined: 2,
    capacityTotal: 4,
    joinMode: "INSTANT",
    status: "OPEN",
    hostMemo: "빨간 모자예요 🙂",
    memoUpdatedAtText: "10분 전",
    host: { userId: "u1", nickname: "민수", kudosCount: 12 },
    myState: { membershipStatus: "NONE", canJoin: true },
  },
  {
    id: "2",
    category: CATEGORIES.MEAL,
    title: "🍜 저녁 라멘 같이 먹어요",
    meetingTimeText: "오늘 20:30",
    durationHours: 2,
    locationText: "홍대입구 근처",
    distanceText: "1.2km",
    capacityJoined: 4,
    capacityTotal: 4,
    joinMode: "INSTANT",
    status: "FULL",
    hostMemo: "늦으면 먼저 시작해요!",
    memoUpdatedAtText: "1시간 전",
    host: { userId: "u2", nickname: "지수" },
    myState: { membershipStatus: "NONE", canJoin: false, reason: "정원마감" },
  },
  {
    id: "3",
    category: CATEGORIES.GAMES,
    title: "🎮 보드게임 가볍게",
    meetingTimeText: "내일 14:00",
    durationHours: 2,
    locationText: "성수 카페",
    distanceText: "0.9km",
    capacityJoined: 1,
    capacityTotal: 5,
    joinMode: "APPROVAL",
    status: "OPEN",
    hostMemo: "처음 와도 OK",
    memoUpdatedAtText: "방금",
    host: { userId: "u3", nickname: "현우", kudosCount: 3 },
    myState: { membershipStatus: "NONE", canJoin: true },
  },
];

export async function listMeetings(params?: {
  category?: CategoryKey | "ALL";
  sort?: "LATEST" | "NEAR" | "SOON";
  status?: PostStatus | "ALL";
}): Promise<MeetingPost[]> {
  const category = params?.category ?? "ALL";
  const status = params?.status ?? "ALL";

  let res = [...MOCK];

  if (category !== "ALL") res = res.filter((m) => m.category.id === category);
  if (status !== "ALL") res = res.filter((m) => m.status === status);

  // MVP: sort는 추후 meeting_time/distance 기반 정렬로 확장
  return res;
}

export async function getMeeting(id: string): Promise<MeetingPost | null> {
  return MOCK.find((m) => m.id === id) ?? null;
}

/**
 * 참여하기:
 * - INSTANT: JOINED
 * - APPROVAL: PENDING
 */
export async function joinMeeting(id: string): Promise<{
  membershipStatus: MembershipStatus;
  post: MeetingPost | null;
}> {
  const post = MOCK.find((m) => m.id === id);
  if (!post) return { membershipStatus: "NONE", post: null };

  if (post.status !== "OPEN") {
    post.myState = { membershipStatus: "NONE", canJoin: false, reason: "참여 불가" };
    return { membershipStatus: "NONE", post };
  }

  const next: MembershipStatus = post.joinMode === "INSTANT" ? "JOINED" : "PENDING";

  // 선착순이면 인원 +1 처리
  if (next === "JOINED") {
    post.capacityJoined = Math.min(post.capacityTotal, post.capacityJoined + 1);
    if (post.capacityJoined >= post.capacityTotal) post.status = "FULL";
  }

  post.myState = {
    membershipStatus: next,
    canJoin: false,
    reason: next === "PENDING" ? "승인 대기" : undefined,
  };

  return { membershipStatus: next, post };
}

export async function cancelJoin(id: string): Promise<{ ok: true; post: MeetingPost | null }> {
  const post = MOCK.find((m) => m.id === id);
  if (!post) return { ok: true, post: null };

  if (post.myState?.membershipStatus === "JOINED") {
    post.capacityJoined = Math.max(0, post.capacityJoined - 1);
    if (post.status === "FULL") post.status = "OPEN";
  }

  post.myState = { membershipStatus: "CANCELED", canJoin: true };
  return { ok: true, post };
}

export async function updateHostMemo(id: string, memo: string): Promise<{ ok: true; post: MeetingPost | null }> {
  const post = MOCK.find((m) => m.id === id);
  if (!post) return { ok: true, post: null };
  post.hostMemo = memo;
  post.memoUpdatedAtText = "방금";
  return { ok: true, post };
}

export async function cancelMeeting(id: string): Promise<{ ok: true; post: MeetingPost | null }> {
  const post = MOCK.find((m) => m.id === id);
  if (!post) return { ok: true, post: null };
  post.status = "CANCELED";
  post.myState = {
    membershipStatus: post.myState?.membershipStatus ?? "NONE",
    canJoin: false,
    reason: "취소됨",
  };
  return { ok: true, post };
}
