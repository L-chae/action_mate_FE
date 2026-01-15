import type { CategoryKey, MembershipStatus, HostSummary, MeetingPost } from "./types";

// ✅ 0. 공통 타입 및 정렬 타입 정의
export type MeetingParams = {
  title: string;
  category: CategoryKey;
  meetingTimeText: string;
  meetingTimeIso?: string;
  locationText: string;
  locationLat?: number;
  locationLng?: number;
  capacityTotal: number;
  content: string;
  joinMode: "INSTANT" | "APPROVAL";
  conditions?: string;
  durationMinutes: number;
  items?: string;
};

// ✅ 홈 화면 정렬 옵션
export type HomeSort = "LATEST" | "NEAR" | "SOON";

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

// ✅ Mock Data (전역 변수로 관리하여 데이터 동기화)
let _MOCK_DATA: MeetingPost[] = [
  {
    id: "1",
    category: "SPORTS",
    title: "🏸 배드민턴 2게임만 (초보 환영)",
    meetingTimeText: "오늘 19:00",
    meetingTime: new Date().toISOString(), // 마감임박 계산용
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
];

// --- Helper: 네트워크 지연 시뮬레이션 ---
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Helper: 거리 파싱 (0.6km -> 0.6) ---
function parseKm(distanceText?: string) {
  if (!distanceText) return 999;
  const n = parseFloat(distanceText.replace("km", "").trim());
  return Number.isFinite(n) ? n : 999;
}

/**
 * ✅ 1. 목록 조회 (홈 화면 필터링 & 정렬 통합)
 */
export async function listMeetings(params?: { 
  category?: CategoryKey | "ALL"; 
  sort?: HomeSort; // 정렬 옵션 추가
}): Promise<MeetingPost[]> {
  await delay();

  const category = params?.category;
  const sort = params?.sort ?? "LATEST";

  // 1) 필터링
  let filtered = [..._MOCK_DATA];
  if (category && category !== "ALL") {
    filtered = filtered.filter((m) => m.category === category);
  }

  // 2) 정렬
  filtered.sort((a, b) => {
    if (sort === "NEAR") {
      // 거리순 (mock 데이터의 distanceText 파싱)
      return parseKm(a.distanceText) - parseKm(b.distanceText);
    } 
    if (sort === "SOON") {
      // 마감임박순 (meetingTime ISO 문자열 비교)
      // meetingTime이 없으면 가장 뒤로 보냄
      const timeA = a.meetingTime ? new Date(a.meetingTime).getTime() : Number.MAX_SAFE_INTEGER;
      const timeB = b.meetingTime ? new Date(b.meetingTime).getTime() : Number.MAX_SAFE_INTEGER;
      return timeA - timeB;
    }
    // LATEST (기본값): ID 역순 (최신순)
    return Number(b.id) - Number(a.id);
  });

  return filtered;
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
 * ✅ 3. 참여 요청
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
 * ✅ 4. 참여/신청 취소
 */
export async function cancelJoin(id: string): Promise<{ post: MeetingPost }> {
  await delay();
  const index = _MOCK_DATA.findIndex((m) => m.id === id);
  if (index === -1) throw new Error("Not found");

  const target = _MOCK_DATA[index];
  const oldStatus = target.myState?.membershipStatus;

  let newJoinedCount = target.capacityJoined;

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
 * ✅ 5. 본문 수정
 */
export async function updateContent(id: string, text: string): Promise<{ post: MeetingPost }> {
  await delay();
  const index = _MOCK_DATA.findIndex((m) => m.id === id);
  if (index === -1) throw new Error("Not found");

  _MOCK_DATA[index] = {
    ..._MOCK_DATA[index],
    content: text,
  };

  return { post: _MOCK_DATA[index] };
}

/**
 * ✅ 6. 모임 취소 (삭제)
 */
export async function cancelMeeting(id: string): Promise<{ post: MeetingPost }> {
  await delay();
  const index = _MOCK_DATA.findIndex((m) => m.id === id);
  if (index === -1) throw new Error("Not found");

  _MOCK_DATA.splice(index, 1);
  return { post: { ..._MOCK_DATA[0], status: "CANCELED" } };
}

/**
 * ✅ 7. 모임 생성
 */
export async function createMeeting(data: MeetingParams): Promise<MeetingPost> {
  await delay(800);

  const newId = Date.now().toString();

  const newMeeting: MeetingPost = {
    id: newId,
    category: data.category,
    title: data.title,
    meetingTimeText: data.meetingTimeText,
    meetingTime: data.meetingTimeIso, // 정렬을 위해 ISO 저장 필수
    
    distanceText: "0.1km", // 방금 만든건 아주 가깝다고 가정
    locationText: data.locationText,
    locationLat: data.locationLat,
    locationLng: data.locationLng,

    capacityJoined: 1, // 호스트 포함
    capacityTotal: data.capacityTotal,
    joinMode: data.joinMode,
    conditions: data.conditions,

    status: "OPEN",
    content: data.content,
    
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

  _MOCK_DATA.unshift(newMeeting); // 최신순 정렬을 위해 맨 앞에 추가
  return newMeeting;
}

/**
 * ✅ 8. 모임 수정
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
    durationHours: Math.round((data.durationMinutes / 60) * 10) / 10,
    durationMinutes: data.durationMinutes,
  };

  _MOCK_DATA[index] = updatedMeeting;
  return updatedMeeting;
}