import type {
  CategoryKey,
  MembershipStatus,
  HostSummary,
  MeetingPost,
} from "./types";

// ✅ 0. 공통 타입 및 정렬 타입 정의
export type MeetingParams = {
  title: string;
  category: CategoryKey;

  // ✅ 이제 외부에서 받아도 되지만, 서비스에서 meetingTimeIso 기준으로 재생성해서 통일함
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

// --- Helper: 네트워크 지연 시뮬레이션 ---
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Helper: 거리 파싱 (0.6km -> 0.6) ---
function parseKm(distanceText?: string) {
  if (!distanceText) return 999;
  const n = parseFloat(distanceText.replace("km", "").trim());
  return Number.isFinite(n) ? n : 999;
}

// ✅ Helper: 0패딩
function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// ✅ Helper: 날짜 + 요일 + 시간 포맷 (요청한 형태)
const DOW = ["일", "월", "화", "수", "목", "금", "토"];
function formatMeetingTimeText(dt: Date) {
  const m = dt.getMonth() + 1;
  const d = dt.getDate();
  const dow = DOW[dt.getDay()];
  return `${m}.${d}(${dow}) ${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
}

// ✅ Helper: 오늘 기준 특정 시각 만들기(로컬 타임존 기준)
function atLocal(daysFromToday: number, hour: number, minute: number) {
  const now = new Date();
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + daysFromToday,
    hour,
    minute,
    0,
    0
  );
}

// ✅ Mock Data (전역 변수로 관리하여 데이터 동기화)
// - meetingTime(ISO) 기준으로 meetingTimeText를 항상 재생성해서 "날짜(요일) 시간" 통일
const t1 = atLocal(0, 19, 0);
const t2 = atLocal(0, 20, 30);
const t3 = atLocal(1, 14, 0);
const t4 = atLocal(0, 21, 0);

let _MOCK_DATA: MeetingPost[] = [
  {
    id: "1",
    category: "SPORTS",
    title: "🏸 배드민턴 2게임만 (초보 환영)",
    meetingTime: t1.toISOString(),
    meetingTimeText: formatMeetingTimeText(t1),

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
    meetingTime: t2.toISOString(),
    meetingTimeText: formatMeetingTimeText(t2),

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
    meetingTime: t3.toISOString(),
    meetingTimeText: formatMeetingTimeText(t3),

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
    meetingTime: t4.toISOString(), // ✅ 없던 meetingTime(ISO)도 넣어서 정렬/표시 통일
    meetingTimeText: formatMeetingTimeText(t4),

    distanceText: "2.4km",
    locationText: "반포 나들목",
    locationLat: 37.509,
    locationLng: 126.995,
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

/**
 * ✅ 1. 목록 조회 (홈 화면 필터링 & 정렬 통합)
 */
export async function listMeetings(params?: {
  category?: CategoryKey | "ALL";
  sort?: HomeSort;
}): Promise<MeetingPost[]> {
  await delay();

  const category = params?.category;
  const sort = params?.sort ?? "LATEST";

  // 1) 필터링
  let filtered = [..._MOCK_DATA];
  if (category && category !== "ALL") {
    filtered = filtered.filter((m) => m.category === category);
  }

  // ✅ 표시 텍스트는 항상 meetingTime 기반으로 재생성(혹시 옛 데이터 섞여도 통일)
  filtered = filtered.map((m) => {
    const iso = m.meetingTime;
    if (!iso) return m;
    const dt = new Date(iso);
    return { ...m, meetingTimeText: formatMeetingTimeText(dt) };
  });

  // 2) 정렬
  filtered.sort((a, b) => {
    if (sort === "NEAR") {
      return parseKm(a.distanceText) - parseKm(b.distanceText);
    }
    if (sort === "SOON") {
      const timeA = a.meetingTime
        ? new Date(a.meetingTime).getTime()
        : Number.MAX_SAFE_INTEGER;
      const timeB = b.meetingTime
        ? new Date(b.meetingTime).getTime()
        : Number.MAX_SAFE_INTEGER;
      return timeA - timeB;
    }
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

  if (!found) throw new Error("Meeting not found");

  // ✅ 상세도 표기 통일
  const iso = found.meetingTime;
  const meetingTimeText = iso
    ? formatMeetingTimeText(new Date(iso))
    : found.meetingTimeText;

  return { ...found, meetingTimeText };
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
  const newStatus: MembershipStatus =
    target.joinMode === "APPROVAL" ? "PENDING" : "MEMBER";

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
export async function updateContent(
  id: string,
  text: string
): Promise<{ post: MeetingPost }> {
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
export async function cancelMeeting(
  id: string
): Promise<{ post: MeetingPost }> {
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

  // ✅ 핵심: ISO가 기준, meetingTimeText는 여기서 재생성
  const meetingTimeIso = data.meetingTimeIso ?? new Date().toISOString();
  const meetingTimeText = formatMeetingTimeText(new Date(meetingTimeIso));

  const newMeeting: MeetingPost = {
    id: newId,
    category: data.category,
    title: data.title,

    meetingTime: meetingTimeIso,
    meetingTimeText,

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
 * ✅ 8. 모임 수정
 */
export async function updateMeeting(
  id: string,
  data: MeetingParams
): Promise<MeetingPost> {
  await delay(800);
  const index = _MOCK_DATA.findIndex((m) => m.id === id);
  if (index === -1) throw new Error("Not found");

  const original = _MOCK_DATA[index];

  const meetingTimeIso =
    data.meetingTimeIso ?? original.meetingTime ?? new Date().toISOString();
  const meetingTimeText = formatMeetingTimeText(new Date(meetingTimeIso));

  const updatedMeeting: MeetingPost = {
    ...original,
    ...data,

    // ✅ data에 들어있는 meetingTimeText는 무시하고 여기서 통일
    meetingTime: meetingTimeIso,
    meetingTimeText,

    content: data.content,
    durationHours: Math.round((data.durationMinutes / 60) * 10) / 10,
    durationMinutes: data.durationMinutes,
  };

  _MOCK_DATA[index] = updatedMeeting;
  return updatedMeeting;
}
