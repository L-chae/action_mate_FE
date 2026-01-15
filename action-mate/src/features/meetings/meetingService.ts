import type { CategoryKey, MembershipStatus, HostSummary, MeetingPost } from "./types";

// ✅ 0. 공통 타입 정의
export type MeetingParams = {
  title: string;
  category: CategoryKey;
  meetingTimeText: string;
  meetingTimeIso?: string;
  locationText: string;
  locationLat?: number;
  locationLng?: number;
  capacityTotal: number;
  content: string; // 본문
  joinMode: "INSTANT" | "APPROVAL";
  conditions?: string;
  durationMinutes: number;
  items?: string;
};

// ✅ Mock Hosts
const HOST_USERS: Record<string, HostSummary> = {
  user1: {
    id: "u1",
    nickname: "민수",
    mannerTemp: 37.5,
    kudosCount: 12,
    intro: "운동 끝나고 맥주 한잔 좋아해요 🍺",
    avatarUrl: "https://i.pravatar.cc/150?u=u1",
  },
  user2: {
    id: "u2",
    nickname: "보드게임마스터",
    mannerTemp: 42.0,
    kudosCount: 56,
    intro: "전략 게임 전문입니다. 초보 환영!",
    avatarUrl: "https://i.pravatar.cc/150?u=u2",
  },
  user3: {
    id: "u3",
    nickname: "새벽러너",
    mannerTemp: 36.5,
    kudosCount: 3,
    intro: "매일 아침 6시 뜁니다.",
  },
  user4: {
    id: "u4",
    nickname: "맛집탐방러",
    mannerTemp: 38.2,
    kudosCount: 20,
    intro: "맛없는 건 안 먹어요 🙅‍♂️",
    avatarUrl: "https://i.pravatar.cc/150?u=u4",
  },
};

// ✅ Mock Data (hostMemo 삭제됨)
let _MOCK_DATA: MeetingPost[] = [
  {
    id: "1",
    category: "SPORTS",
    title: "🏸 배드민턴 2게임만 (초보 환영)",
    meetingTimeText: "오늘 19:00",
    meetingTime: new Date().toISOString(),
    distanceText: "0.6km",
    locationText: "잠원지구 3주차장",
    locationLat: 37.5195,
    locationLng: 127.0093,
    capacityJoined: 2,
    capacityTotal: 4,
    joinMode: "INSTANT",
    status: "OPEN",
    content: "라켓 여분 있어요! 몸만 오세요.",
    myState: { membershipStatus: "NONE", canJoin: true },
    durationHours: 2,
    host: HOST_USERS.user1,
  },
  {
    id: "2",
    category: "MEAL",
    title: "🍜 저녁 라멘 같이 먹어요",
    meetingTimeText: "오늘 20:30",
    meetingTime: new Date().toISOString(),
    distanceText: "1.2km",
    locationText: "홍대 멘야무사시",
    locationLat: 37.5558,
    locationLng: 126.9225,
    capacityJoined: 4,
    capacityTotal: 4,
    joinMode: "INSTANT",
    status: "FULL",
    content: "맛집이라 웨이팅 있을 수 있어요.",
    myState: { membershipStatus: "NONE", canJoin: false, reason: "정원마감" },
    durationHours: 1.5,
    host: HOST_USERS.user4,
  },
  {
    id: "3",
    category: "GAMES",
    title: "🎮 보드게임 가볍게 한 판",
    meetingTimeText: "내일 14:00",
    meetingTime: new Date(Date.now() + 86400000).toISOString(),
    distanceText: "0.9km",
    locationText: "성수 앨리스카페",
    locationLat: 37.5446,
    locationLng: 127.0559,
    capacityJoined: 1,
    capacityTotal: 5,
    joinMode: "APPROVAL",
    conditions: "보드게임 룰 이해 빠르신 분",
    status: "OPEN",
    content: "룰 몰라도 알려드려요 😉",
    myState: { membershipStatus: "NONE", canJoin: true },
    durationHours: 3,
    host: HOST_USERS.user2,
  },
  {
    id: "4",
    category: "SPORTS",
    title: "🏃 한강 러닝 5km",
    meetingTimeText: "오늘 21:00",
    distanceText: "2.4km",
    locationText: "반포 나들목",
    locationLat: 37.5090,
    locationLng: 126.9950,
    capacityJoined: 3,
    capacityTotal: 6,
    joinMode: "INSTANT",
    status: "OPEN",
    content: "가볍게 5km 600페이스로 뜁니다.",
    myState: { membershipStatus: "NONE", canJoin: true },
    durationHours: 1,
    host: HOST_USERS.user3,
  },
  {
    id: "5",
    category: "ETC",
    title: "📸 야간 산책 + 사진 찍기",
    meetingTimeText: "오늘 22:00",
    distanceText: "3.1km",
    locationText: "낙산공원 입구",
    locationLat: 37.5807,
    locationLng: 127.0076,
    capacityJoined: 2,
    capacityTotal: 5,
    joinMode: "APPROVAL",
    status: "OPEN",
    content: "카메라 기종 상관없어요 폰카 가능",
    myState: { membershipStatus: "NONE", canJoin: true },
    durationHours: 2,
    host: HOST_USERS.user1,
  },
  {
    id: "6",
    category: "MEAL",
    title: "☕ 점심 커피 한 잔",
    meetingTimeText: "내일 12:30",
    distanceText: "0.1km",
    locationText: "스타벅스 강남R점",
    locationLat: 37.4979,
    locationLng: 127.0276,
    capacityJoined: 1,
    capacityTotal: 2,
    joinMode: "INSTANT",
    status: "OPEN",
    content: "점심시간 짧게 커피 드실 분!",
    myState: { membershipStatus: "NONE", canJoin: true },
    durationHours: 1,
    host: HOST_USERS.user4,
  },
  {
    id: "7",
    category: "STUDY",
    title: "📚 각자 할 일 하는 스터디",
    meetingTimeText: "주말 10:00",
    distanceText: "1.5km",
    locationText: "투썸플레이스 사당점",
    locationLat: 37.4765,
    locationLng: 126.9816,
    capacityJoined: 3,
    capacityTotal: 4,
    joinMode: "INSTANT",
    status: "OPEN",
    content: "3시간 정도 집중해요",
    myState: { membershipStatus: "NONE", canJoin: true },
    durationHours: 3,
    host: HOST_USERS.user3,
  },
  {
    id: "8",
    category: "GAMES",
    title: "♟️ 체스 두실 분",
    meetingTimeText: "내일 18:00",
    distanceText: "2.0km",
    locationText: "이디야 커피",
    locationLat: 37.5020,
    locationLng: 127.0370,
    capacityJoined: 2,
    capacityTotal: 2,
    joinMode: "INSTANT",
    status: "ENDED",
    content: "체스판 가져갑니다.",
    myState: { membershipStatus: "NONE", canJoin: false, reason: "종료됨" },
    durationHours: 2,
    host: HOST_USERS.user2,
  },
];

// --- Helper: 네트워크 지연 시뮬레이션 ---
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * ✅ 1. 목록 조회
 */
export async function listMeetings(params?: { category?: CategoryKey | "ALL" }): Promise<MeetingPost[]> {
  await delay();
  const category = params?.category;
  const sorted = [..._MOCK_DATA].sort((a, b) => Number(b.id) - Number(a.id));

  if (!category || category === "ALL") {
    return sorted;
  }
  return sorted.filter((m) => m.category === category);
}

/**
 * ✅ 2. 상세 조회
 */
export async function getMeeting(id: string): Promise<MeetingPost> {
  await delay();
  const normalizedId = Array.isArray(id) ? id[0] : String(id ?? "");
  const found = _MOCK_DATA.find((m) => String(m.id) === normalizedId);

  if (!found) {
    throw new Error("Meeting not found");
  }
  return { ...found };
}

/**
 * ✅ 3. 참여 요청 (승인제/선착순 구분)
 */
export async function joinMeeting(
  id: string
): Promise<{ post: MeetingPost; membershipStatus: MembershipStatus }> {
  await delay();
  const index = _MOCK_DATA.findIndex((m) => m.id === id);
  if (index === -1) throw new Error("Not found");

  const target = _MOCK_DATA[index];
  const newStatus: MembershipStatus = target.joinMode === "APPROVAL" ? "PENDING" : "MEMBER";

  let newJoinedCount = target.capacityJoined;
  
  if (newStatus === "MEMBER") {
    newJoinedCount = Math.min(target.capacityJoined + 1, target.capacityTotal);
  }

  _MOCK_DATA[index] = {
    ...target,
    capacityJoined: newJoinedCount,
    status: newJoinedCount >= target.capacityTotal ? "FULL" : target.status,
    myState: {
      membershipStatus: newStatus,
      canJoin: false,
      reason: newStatus === "PENDING" ? "승인 대기중" : "참여 완료",
    },
  };

  return { post: _MOCK_DATA[index], membershipStatus: newStatus };
}

/**
 * ✅ 4. 참여/신청 취소 (오류 해결: JOINED 삭제)
 */
export async function cancelJoin(id: string): Promise<{ post: MeetingPost }> {
  await delay();
  const index = _MOCK_DATA.findIndex((m) => m.id === id);
  if (index === -1) throw new Error("Not found");

  const target = _MOCK_DATA[index];
  const oldStatus = target.myState?.membershipStatus;

  let newJoinedCount = target.capacityJoined;

  // ✅ 오류 해결: JOINED 상태 비교 제거. MEMBER일 때만 차감.
  if (oldStatus === "MEMBER") {
    newJoinedCount = Math.max(0, target.capacityJoined - 1);
  }

  _MOCK_DATA[index] = {
    ...target,
    capacityJoined: newJoinedCount,
    status: "OPEN",
    myState: {
      membershipStatus: "NONE",
      canJoin: true,
    },
  };

  return { post: _MOCK_DATA[index] };
}

/**
 * ✅ 5. 본문 수정 (오류 해결: hostMemo 할당 제거)
 * 함수명 변경 제안: updateHostMemo -> updateContent
 */
export async function updateContent(id: string, text: string): Promise<{ post: MeetingPost }> {
  await delay();
  const index = _MOCK_DATA.findIndex((m) => m.id === id);
  if (index === -1) throw new Error("Not found");

  _MOCK_DATA[index] = {
    ..._MOCK_DATA[index],
    content: text, // ✅ hostMemo 삭제, content만 업데이트
    // memoUpdatedAtText: "방금 전", // 필요 시 사용
  };

  return { post: _MOCK_DATA[index] };
}

/**
 * ✅ 6. 모임 취소 (삭제 처리)
 */
export async function cancelMeeting(id: string): Promise<{ post: MeetingPost }> {
  await delay();
  const index = _MOCK_DATA.findIndex((m) => m.id === id);
  if (index === -1) throw new Error("Not found");

  _MOCK_DATA.splice(index, 1);
  return { post: { ..._MOCK_DATA[0], status: "CANCELED" } };
}

/**
 * ✅ 7. 모임 생성 (오류 해결: hostMemo 할당 제거)
 */
export async function createMeeting(data: MeetingParams): Promise<MeetingPost> {
  await delay(800);

  const newId = Date.now().toString();

  const newMeeting: MeetingPost = {
    id: newId,
    category: data.category,
    title: data.title,
    meetingTimeText: data.meetingTimeText,
    meetingTime: data.meetingTimeIso,
    
    distanceText: "0.1km",
    locationText: data.locationText,
    locationLat: data.locationLat,
    locationLng: data.locationLng,

    capacityJoined: 1,
    capacityTotal: data.capacityTotal,
    joinMode: data.joinMode,
    conditions: data.conditions,

    status: "OPEN",
    content: data.content,
    // ✅ hostMemo 삭제됨
    
    myState: { membershipStatus: "HOST", canJoin: false, reason: "호스트" },
    durationHours: Math.round((data.durationMinutes / 60) * 10) / 10,
    durationMinutes: data.durationMinutes,

    host: {
      id: "me",
      nickname: "나(호스트)",
      mannerTemp: 36.5,
      kudosCount: 0,
      intro: "방금 만든 모임입니다!",
    },
  };

  _MOCK_DATA.unshift(newMeeting);
  return newMeeting;
}

/**
 * ✅ 8. 모임 수정 (오류 해결: hostMemo 할당 제거)
 */
export async function updateMeeting(id: string, data: MeetingParams): Promise<MeetingPost> {
  await delay(800);
  const index = _MOCK_DATA.findIndex((m) => m.id === id);
  if (index === -1) throw new Error("Not found");

  const original = _MOCK_DATA[index];

  const updatedMeeting: MeetingPost = {
    ...original,
    ...data,
    meetingTime: data.meetingTimeIso ?? original.meetingTime,
    content: data.content,
    // ✅ hostMemo 삭제됨
    durationHours: Math.round((data.durationMinutes / 60) * 10) / 10,
    durationMinutes: data.durationMinutes,
  };

  _MOCK_DATA[index] = updatedMeeting;
  return updatedMeeting;
}