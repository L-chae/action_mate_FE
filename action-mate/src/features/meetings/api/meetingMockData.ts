// ============================================================================
// src/features/meetings/mocks/meetingMockData.ts
// ============================================================================

import type { UserSummary } from "@/shared/model/types";
import type { Comment, HostSummary, MeetingPost } from "../model/types";
import type { Participant } from "@/features/meetings/model/types";

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
const makeUser = (u: { id: string; nickname: string; avatarUrl?: string | null }): UserSummary =>
  ({
    id: String(u.id),
    nickname: String(u.nickname),
    avatarUrl: u.avatarUrl ?? undefined,
  } as unknown as UserSummary);

const shallowCloneComment = (c: Comment): Comment =>
  ({
    ...(c as any),
    id: String((c as any)?.id ?? ""),
    parentId: (c as any)?.parentId,
    content: String((c as any)?.content ?? ""),
    createdAt: String((c as any)?.createdAt ?? ""),
    author: { ...((c as any)?.author ?? {}) },
  } as Comment);

const shallowCloneParticipant = (p: Participant): Participant =>
  ({
    ...(p as any),
    id: String((p as any)?.id ?? ""),
    nickname: String((p as any)?.nickname ?? "알 수 없음"),
    avatarUrl: (p as any)?.avatarUrl ?? null,
    status: (p as any)?.status,
    joinedAt: (p as any)?.joinedAt,
  } as Participant);

// -----------------------------------------------------------------------------
// Users (댓글/참여자 공용)
// -----------------------------------------------------------------------------
const U = {
  hostMinji: makeUser({
    id: "user_host_minji",
    nickname: "호스트민지",
    avatarUrl: "https://picsum.photos/seed/user_host_minji/128/128",
  }),
  hostMinsu: makeUser({ id: "u1", nickname: "민수", avatarUrl: "https://i.pravatar.cc/150?u=u1" }),
  hostBoard: makeUser({ id: "u2", nickname: "보드게임마스터", avatarUrl: "https://i.pravatar.cc/150?u=u2" }),
  hostRunner: makeUser({ id: "u3", nickname: "새벽러너", avatarUrl: null }),

  me: makeUser({ id: "me", nickname: "나(호스트)", avatarUrl: "https://i.pravatar.cc/150?u=me" }),

  seoyeon: makeUser({ id: "user_101", nickname: "서연", avatarUrl: "https://picsum.photos/seed/user_101/128/128" }),
  junho: makeUser({ id: "user_202", nickname: "준호", avatarUrl: "https://picsum.photos/seed/user_202/128/128" }),
  yuna: makeUser({ id: "user_701", nickname: "윤아", avatarUrl: "https://picsum.photos/seed/user_701/128/128" }),
  doyoon: makeUser({ id: "user_702", nickname: "도윤", avatarUrl: "https://picsum.photos/seed/user_702/128/128" }),
  jihoon: makeUser({ id: "user_703", nickname: "지훈", avatarUrl: "https://picsum.photos/seed/user_703/128/128" }),
  haneul: makeUser({ id: "user_706", nickname: "하늘", avatarUrl: "https://picsum.photos/seed/user_706/128/128" }),
  harin: makeUser({ id: "user_705", nickname: "하린", avatarUrl: "https://picsum.photos/seed/user_705/128/128" }),
  hyunwoo: makeUser({ id: "user_907", nickname: "현우", avatarUrl: "https://picsum.photos/seed/user_907/128/128" }),
};

// -----------------------------------------------------------------------------
// Host Users (기존 구조 유지)
// -----------------------------------------------------------------------------
export const HOST_USERS: Record<string, HostSummary> = {
  user1: {
    id: "u1",
    nickname: "민수",
    avgRate: 3.5,
    orgTime: 12,
    intro: "운동 좋아해요. 초보도 환영!",
    avatarUrl: "https://i.pravatar.cc/150?u=u1",
  },
  user2: {
    id: "u2",
    nickname: "보드게임마스터",
    avgRate: 5.0,
    orgTime: 56,
    intro: "룰 설명 가능 / 초보 환영!",
    avatarUrl: "https://i.pravatar.cc/150?u=u2",
  },
  user3: {
    id: "u3",
    nickname: "새벽러너",
    avgRate: 2.25,
    orgTime: 3,
    intro: "가볍게 달려요.",
    avatarUrl: null,
  },
  me: {
    id: "me",
    nickname: "나(호스트)",
    avgRate: 2.4,
    orgTime: 0,
    intro: "내가 만든 모임이에요.",
    avatarUrl: "https://i.pravatar.cc/150?u=me",
  },
};

// -----------------------------------------------------------------------------
// Time Helpers
// -----------------------------------------------------------------------------
const __now = Date.now();
const h = (hoursFromNow: number) => new Date(__now + hoursFromNow * 3600_000).toISOString();
const d = (daysFromNow: number, hour = 12, minute = 0) => {
  const base = new Date(__now);
  base.setDate(base.getDate() + daysFromNow);
  base.setHours(hour, minute, 0, 0);
  return base.toISOString();
};
const minAgo = (m: number) => new Date(__now - m * 60_000).toISOString();

// -----------------------------------------------------------------------------
// Default Comments (fallback, 1~2개)
// -----------------------------------------------------------------------------
export const MEETING_COMMENTS_MOCK: Comment[] = [
  {
    id: "default_cmt_001",
    content: "처음 참여인데, 진행 방식 간단히 알려주실 수 있을까요?",
    createdAt: minAgo(90),
    author: U.haneul,
  },
  {
    id: "default_cmt_002",
    parentId: "default_cmt_001",
    content: "네! 글에 적힌 흐름대로 진행하고, 오시면 현장에서 바로 안내드릴게요 :)",
    createdAt: minAgo(84),
    author: U.hostMinji,
  },
];

// -----------------------------------------------------------------------------
// ✅ Meeting별 댓글(연결용) — 각 게시글 1~2개, 톤/상황 다양화
// - UI에서는 meetingId로 매칭해서 사용
// -----------------------------------------------------------------------------
export const MEETING_COMMENTS_BY_MEETING_ID: Record<string, Comment[]> = {
  // SPORTS
  "101": [
    {
      id: "101_cmt_001",
      content: "라켓 없으면 참여 어려울까요? 대여 가능하면 알려주세요!",
      createdAt: minAgo(120),
      author: U.yuna,
    },
    {
      id: "101_cmt_002",
      parentId: "101_cmt_001",
      content: "라켓 1~2개 여유 있어요. 운동화만 챙기시면 됩니다!",
      createdAt: minAgo(114),
      author: U.hostMinsu,
    },
  ],
  "102": [
    {
      id: "102_cmt_001",
      content: "마감이면 취소표 나올 때 알려주실 수 있나요?",
      createdAt: minAgo(210),
      author: U.jihoon,
    },
  ],
  "103": [
    {
      id: "103_cmt_001",
      content: "이미 시작이면 중간 합류는 어렵죠? 다음 번 있으면 참여하고 싶어요.",
      createdAt: minAgo(70),
      author: U.harin,
    },
  ],
  "104": [
    {
      id: "104_cmt_001",
      content: "취소된 건가요? 다음 일정 올라오면 알림 받고 싶어요.",
      createdAt: minAgo(300),
      author: U.seoyeon,
    },
  ],

  // MEAL
  "201": [
    {
      id: "201_cmt_001",
      content: "알레르기(해산물) 있으면 메뉴 조정 가능할까요?",
      createdAt: minAgo(160),
      author: U.jihoon,
    },
    {
      id: "201_cmt_002",
      parentId: "201_cmt_001",
      content: "네! 해산물 어려우시면 다른 메뉴로도 맞춰볼게요. 채팅으로 편하게 말씀 주세요.",
      createdAt: minAgo(154),
      author: U.me,
    },
  ],
  "202": [
    {
      id: "202_cmt_001",
      content: "늦참도 가능할까요? 20~30분 정도 늦을 것 같아요.",
      createdAt: minAgo(95),
      author: U.doyoon,
    },
    {
      id: "202_cmt_002",
      parentId: "202_cmt_001",
      content: "가능해요. 도착 전에 톡만 주세요. 자리 공유해드릴게요.",
      createdAt: minAgo(92),
      author: U.hostBoard,
    },
  ],
  "203": [
    {
      id: "203_cmt_001",
      content: "승인 모임이면 기준이 있을까요? (처음 참여라 궁금해요)",
      createdAt: minAgo(260),
      author: U.haneul,
    },
  ],

  // STUDY
  "301": [
    {
      id: "301_cmt_001",
      content: "마지막 공유는 자유참여인가요? 조용히 작업만 하고 가도 괜찮죠?",
      createdAt: minAgo(190),
      author: U.yuna,
    },
    {
      id: "301_cmt_002",
      parentId: "301_cmt_001",
      content: "네! 공유는 원하시는 분만 가볍게 해요. 작업만 하고 가셔도 됩니다.",
      createdAt: minAgo(184),
      author: U.hostRunner,
    },
  ],
  "302": [
    {
      id: "302_cmt_001",
      content: "책은 각자 읽고 가볍게 감상만 공유하는 느낌인가요?",
      createdAt: minAgo(230),
      author: U.seoyeon,
    },
  ],
  "303": [
    {
      id: "303_cmt_001",
      content: "이미 참여중이면 채팅방에서 공지 같은 것도 올라오나요?",
      createdAt: minAgo(75),
      author: U.junho,
    },
  ],

  // GAMES
  "401": [
    {
      id: "401_cmt_001",
      content: "완전 초보인데 룰 설명 가능할까요? 난이도 높은 게임은 어려워요 😅",
      createdAt: minAgo(250),
      author: U.haneul,
    },
    {
      id: "401_cmt_002",
      parentId: "401_cmt_001",
      content: "물론이죠! 파티/가벼운 전략으로 진행할게요. 초보 기준으로 맞춰요.",
      createdAt: minAgo(246),
      author: U.hostBoard,
    },
  ],
  "402": [
    {
      id: "402_cmt_001",
      content: "인원 모이면 어떤 장르로 할지 투표하나요?",
      createdAt: minAgo(310),
      author: U.doyoon,
    },
  ],

  // ETC
  "501": [
    {
      id: "501_cmt_001",
      content: "좌석은 각자 예매면, 로비에서 만나서 같이 입장하는 방식인가요?",
      createdAt: minAgo(420),
      author: U.jihoon,
    },
  ],
  "502": [
    {
      id: "502_cmt_001",
      content: "후기 모아볼 수 있을까요? 다음에 또 하면 참여하고 싶어요!",
      createdAt: minAgo(600),
      author: U.yuna,
    },
  ],

  // HOT
  H901: [
    {
      id: "H901_cmt_001",
      content: "번개 모각코면 자리 없을 수도 있겠네요. 자리 못 잡으면 어떻게 하나요?",
      createdAt: minAgo(55),
      author: U.doyoon,
    },
    {
      id: "H901_cmt_002",
      parentId: "H901_cmt_001",
      content: "자리 상황 보고 근처 다른 카페로 이동할 수도 있어요. 오시면 채팅 주세요!",
      createdAt: minAgo(52),
      author: U.hostMinsu,
    },
  ],
  H902: [
    {
      id: "H902_cmt_001",
      content: "혼자 참여해도 괜찮나요? 1인 참여가 많을지 궁금해요.",
      createdAt: minAgo(80),
      author: U.seoyeon,
    },
  ],
  H903: [
    {
      id: "H903_cmt_001",
      content: "다이어리/펜 코너 위주로 보고 싶어요. 동선 정해두셨나요?",
      createdAt: minAgo(130),
      author: U.yuna,
    },
  ],
};

export const getMeetingCommentsMock = (meetingId?: string | null): Comment[] => {
  const id = String(meetingId ?? "").trim();
  const list = MEETING_COMMENTS_BY_MEETING_ID?.[id] ?? MEETING_COMMENTS_MOCK;
  const safe = Array.isArray(list) ? list : [];
  return safe.map(shallowCloneComment);
};

// -----------------------------------------------------------------------------
// ✅ Meeting별 참여자(호스트 화면용) — PENDING 많이 보이게(특히 me가 호스트인 201)
// -----------------------------------------------------------------------------
export const PARTICIPANTS_MOCK_BY_MEETING_ID: Record<string, Participant[]> = {
  // 201: 내가 호스트(승인형) → 대기 신청 다수 노출
  "201": [
    { id: "p201_host", nickname: "나(호스트)", avatarUrl: "https://i.pravatar.cc/150?u=me", status: "HOST", joinedAt: minAgo(800) } as any,
    { id: "p201_001", nickname: "하늘", avatarUrl: "https://picsum.photos/seed/p201_001/96/96", status: "PENDING", joinedAt: minAgo(140) } as any,
    { id: "p201_002", nickname: "지훈", avatarUrl: "https://picsum.photos/seed/p201_002/96/96", status: "PENDING", joinedAt: minAgo(132) } as any,
    { id: "p201_003", nickname: "서연", avatarUrl: "https://picsum.photos/seed/p201_003/96/96", status: "PENDING", joinedAt: minAgo(121) } as any,
    { id: "p201_004", nickname: "윤아", avatarUrl: "https://picsum.photos/seed/p201_004/96/96", status: "PENDING", joinedAt: minAgo(110) } as any,
    { id: "p201_005", nickname: "도윤", avatarUrl: "https://picsum.photos/seed/p201_005/96/96", status: "PENDING", joinedAt: minAgo(96) } as any,
  ],

  // 203: 다른 호스트(샘플)
  "203": [
    { id: "p203_host", nickname: "새벽러너", avatarUrl: null, status: "HOST", joinedAt: minAgo(900) } as any,
    { id: "p203_001", nickname: "윤아", avatarUrl: "https://picsum.photos/seed/p203_001/96/96", status: "PENDING", joinedAt: minAgo(210) } as any,
    { id: "p203_002", nickname: "지수", avatarUrl: "https://picsum.photos/seed/p203_002/96/96", status: "PENDING", joinedAt: minAgo(198) } as any,
    { id: "p203_003", nickname: "현우", avatarUrl: "https://picsum.photos/seed/p203_003/96/96", status: "PENDING", joinedAt: minAgo(186) } as any,
  ],

  // 301: 승인형(샘플)
  "301": [
    { id: "p301_host", nickname: "새벽러너", avatarUrl: null, status: "HOST", joinedAt: minAgo(1000) } as any,
    { id: "p301_001", nickname: "준호", avatarUrl: "https://picsum.photos/seed/p301_001/96/96", status: "PENDING", joinedAt: minAgo(240) } as any,
    { id: "p301_002", nickname: "하린", avatarUrl: "https://picsum.photos/seed/p301_002/96/96", status: "PENDING", joinedAt: minAgo(232) } as any,
  ],

  // 401: 승인형(샘플)
  "401": [
    { id: "p401_host", nickname: "보드게임마스터", avatarUrl: "https://i.pravatar.cc/150?u=u2", status: "HOST", joinedAt: minAgo(1200) } as any,
    { id: "p401_001", nickname: "지훈", avatarUrl: "https://picsum.photos/seed/p401_001/96/96", status: "PENDING", joinedAt: minAgo(260) } as any,
    { id: "p401_002", nickname: "윤아", avatarUrl: "https://picsum.photos/seed/p401_002/96/96", status: "PENDING", joinedAt: minAgo(252) } as any,
  ],

  // H902: 핫 승인형(샘플)
  H902: [
    { id: "pH902_host", nickname: "보드게임마스터", avatarUrl: "https://i.pravatar.cc/150?u=u2", status: "HOST", joinedAt: minAgo(500) } as any,
    { id: "pH902_001", nickname: "민지", avatarUrl: "https://picsum.photos/seed/pH902_001/96/96", status: "PENDING", joinedAt: minAgo(75) } as any,
    { id: "pH902_002", nickname: "현우", avatarUrl: "https://picsum.photos/seed/pH902_002/96/96", status: "PENDING", joinedAt: minAgo(68) } as any,
  ],
};

export const getMeetingParticipantsMock = (meetingId?: string | null): Participant[] => {
  const id = String(meetingId ?? "").trim();
  const list = PARTICIPANTS_MOCK_BY_MEETING_ID?.[id] ?? [];
  const safe = Array.isArray(list) ? list : [];
  return safe.map(shallowCloneParticipant);
};

// -----------------------------------------------------------------------------
// ✅ Meetings Seed (상태/승인/내상태 다양화 + Hot 4개 이상 확보)
// - Hot: OPEN + 잔여 2석 이하 + 3시간 이내(h 기반) → 101, H901, H902, H903
// -----------------------------------------------------------------------------
export const MOCK_MEETINGS_SEED: MeetingPost[] = [
  // -----------------------------
  // SPORTS
  // -----------------------------
  {
    id: "101",
    category: "SPORTS",
    title: "서초구민체육센터 배드민턴 더블 2게임",
    content: "워밍업 후 더블 2게임. 라켓/셔틀콕(가능하면) 지참 권장. 초보 환영!",
    meetingTime: h(2),
    location: { name: "서초구민체육센터(반포)", latitude: 37.4988531475655, longitude: 126.990515657787 } as any,
    address: "서울특별시 서초구 사평대로 55",
    distanceText: "0.8km",
    capacity: { current: 2, max: 4, total: 4 } as any, // 잔여 2
    joinMode: "INSTANT",
    status: "OPEN",
    myState: { membershipStatus: "NONE", canJoin: true } as any,
    durationMinutes: 110,
    host: HOST_USERS.user1,
  },
  {
    id: "102",
    category: "SPORTS",
    title: "서초구민체육센터 탁구 랠리 1시간",
    content: "랠리 위주. 매너 플레이 부탁! (탁구대 대기 있을 수 있어요)",
    meetingTime: h(3.5),
    location: { name: "서초구민체육센터(탁구장)", latitude: 37.4988531475655, longitude: 126.990515657787 } as any,
    address: "서울특별시 서초구 사평대로 55",
    distanceText: "1.1km",
    capacity: { current: 6, max: 6, total: 6 } as any,
    joinMode: "INSTANT",
    status: "FULL",
    myState: { membershipStatus: "MEMBER", canJoin: false, reason: "참여중" } as any,
    durationMinutes: 60,
    host: HOST_USERS.user1,
  },
  {
    id: "103",
    category: "SPORTS",
    title: "서초구민체육센터 농구 3:3 한 판",
    content: "하프코트 3:3로 60~90분. 거친 몸싸움은 지양합니다.",
    conditions: "기본 룰 숙지",
    meetingTime: h(-0.6),
    location: { name: "서초구민체육센터(농구장)", latitude: 37.4988531475655, longitude: 126.990515657787 } as any,
    address: "서울특별시 서초구 사평대로 55",
    distanceText: "1.6km",
    capacity: { current: 6, max: 6, total: 6 } as any,
    joinMode: "INSTANT",
    status: "STARTED",
    myState: { membershipStatus: "NONE", canJoin: false, reason: "이미 시작됨" } as any,
    durationMinutes: 90,
    host: HOST_USERS.user1,
  },
  {
    id: "104",
    category: "SPORTS",
    title: "서초구민체육센터 자유수영 1시간",
    content: "자유수영 1시간 + 정리 10분. 수영모/수경 필수.",
    meetingTime: d(1, 7, 40),
    location: { name: "서초구민체육센터(수영장)", latitude: 37.4988531475655, longitude: 126.990515657787 } as any,
    address: "서울특별시 서초구 사평대로 55",
    distanceText: "2.0km",
    capacity: { current: 1, max: 6, total: 6 } as any,
    joinMode: "APPROVAL",
    status: "CANCELED",
    myState: { membershipStatus: "NONE", canJoin: false, reason: "취소됨" } as any,
    durationMinutes: 60,
    host: HOST_USERS.user3,
  },

  // -----------------------------
  // MEAL
  // -----------------------------
  {
    id: "201",
    category: "MEAL",
    title: "대운식당 생태탕 점심 (승인형)",
    content: "점심에 든든하게 먹고 해산(60분). 1/N, 노쇼는 미리 연락!",
    meetingTime: h(1.2),
    location: { name: "대운식당", latitude: 37.4994, longitude: 127.033 } as any,
    address: "서울특별시 강남구 역삼로5길 6 1층",
    distanceText: "0.4km",
    capacity: { current: 1, max: 4, total: 4 } as any,
    joinMode: "APPROVAL", // ✅ 호스트 화면에서 PENDING 보기 좋게
    status: "OPEN",
    myState: { membershipStatus: "HOST", canJoin: false, reason: "호스트" } as any,
    durationMinutes: 60,
    host: HOST_USERS.me,
  },
  {
    id: "202",
    category: "MEAL",
    title: "꼬끼오 장작구이 치맥",
    content: "퇴근 후 가볍게 치맥! (야장 자리 가능하면 야장으로)",
    meetingTime: d(0, 20, 10),
    location: { name: "꼬끼오 장작구이", latitude: 37.4979, longitude: 127.0285 } as any,
    address: "서울특별시 강남구 강남대로84길 34 1, 2층",
    distanceText: "0.9km",
    capacity: { current: 3, max: 6, total: 6 } as any,
    joinMode: "INSTANT",
    status: "OPEN",
    myState: { membershipStatus: "NONE", canJoin: true } as any,
    durationMinutes: 120,
    host: HOST_USERS.user2,
  },
  {
    id: "203",
    category: "MEAL",
    title: "홍콩반점0410 강남역점 짬뽕/짜장",
    content: "가볍게 먹고 빠르게 해산(45~60분). 매운맛/덜매운맛 조절 가능.",
    meetingTime: d(2, 12, 20),
    location: { name: "홍콩반점0410 강남역점", latitude: 37.4985, longitude: 127.0288 } as any,
    address: "서울특별시 강남구 테헤란로4길 27",
    distanceText: "0.7km",
    capacity: { current: 1, max: 4, total: 4 } as any,
    joinMode: "APPROVAL",
    status: "OPEN",
    myState: { membershipStatus: "PENDING", canJoin: false, reason: "승인 대기중" } as any,
    durationMinutes: 60,
    host: HOST_USERS.user3,
  },

  // -----------------------------
  // STUDY
  // -----------------------------
  {
    id: "301",
    category: "STUDY",
    title: "역삼도서관 모각코 2시간",
    content: "각자 작업(대화 최소) + 마지막 10분만 공유. 노트북/이어폰 권장.",
    conditions: "대화 최소",
    meetingTime: d(1, 19, 30),
    location: { name: "역삼도서관(역삼1문화센터)", latitude: 37.4953968261, longitude: 127.0332430485 } as any,
    address: "서울특별시 강남구 역삼로7길 16 역삼1문화센터 5층",
    distanceText: "0.8km",
    capacity: { current: 2, max: 6, total: 6 } as any,
    joinMode: "APPROVAL",
    status: "OPEN",
    myState: { membershipStatus: "PENDING", canJoin: false, reason: "승인 대기중" } as any,
    durationMinutes: 120,
    host: HOST_USERS.user3,
  },
  {
    id: "302",
    category: "STUDY",
    title: "교보문고 강남점 책/스터디 1시간",
    content: "가볍게 책 보고, 짧게 공유(원하면) 후 해산.",
    meetingTime: d(2, 14, 0),
    location: { name: "교보문고 강남점(교보타워)", latitude: 37.5037373, longitude: 127.0240583 } as any,
    address: "서울특별시 서초구 강남대로 465 교보타워 지하 1~지하 2층",
    distanceText: "0.5km",
    capacity: { current: 1, max: 5, total: 5 } as any,
    joinMode: "INSTANT",
    status: "OPEN",
    myState: { membershipStatus: "NONE", canJoin: true } as any,
    durationMinutes: 70,
    host: HOST_USERS.user2,
  },
  {
    id: "303",
    category: "STUDY",
    title: "스타벅스 강남R 집중 작업 90분",
    content: "각자 작업 + 마지막 5분 목표 체크. 좌석 상황 따라 대기 가능.",
    meetingTime: d(0, 15, 10),
    location: { name: "스타벅스 강남R점", latitude: 37.497711, longitude: 127.028439 } as any,
    address: "서울특별시 강남구 강남대로 390",
    distanceText: "0.3km",
    capacity: { current: 2, max: 4, total: 4 } as any,
    joinMode: "INSTANT",
    status: "OPEN",
    myState: { membershipStatus: "MEMBER", canJoin: false, reason: "참여중" } as any,
    durationMinutes: 90,
    host: HOST_USERS.user1,
  },

  // -----------------------------
  // GAMES
  // -----------------------------
  {
    id: "401",
    category: "GAMES",
    title: "레드버튼 강남점 보드게임 한 판",
    content: "파티게임/가벼운 전략 섞어서 진행. 초보 환영(룰 설명 가능).",
    meetingTime: d(1, 16, 0),
    location: { name: "레드버튼 강남점", latitude: 37.5019, longitude: 127.0262 } as any,
    address: "서울특별시 강남구 강남대로 442 1층",
    distanceText: "0.6km",
    capacity: { current: 2, max: 6, total: 6 } as any,
    joinMode: "APPROVAL",
    status: "OPEN",
    myState: { membershipStatus: "NONE", canJoin: true } as any,
    durationMinutes: 180,
    host: HOST_USERS.user2,
  },
  {
    id: "402",
    category: "GAMES",
    title: "레드버튼 강남2호점 보드게임(2시간)",
    content: "가볍게 2~3개 돌리고 마무리. 인원/선호 장르는 채팅에서 조율해요.",
    meetingTime: d(3, 18, 30),
    location: { name: "레드버튼 강남2호점", latitude: 37.5023, longitude: 127.0298 } as any,
    address: "서울특별시 강남구 강남대로96길 5 지하2층",
    distanceText: "0.9km",
    capacity: { current: 1, max: 6, total: 6 } as any,
    joinMode: "INSTANT",
    status: "OPEN",
    myState: { membershipStatus: "NONE", canJoin: true } as any,
    durationMinutes: 120,
    host: HOST_USERS.user2,
  },

  // -----------------------------
  // ETC
  // -----------------------------
  {
    id: "501",
    category: "ETC",
    title: "서초문화예술회관 공연/전시 같이 보기",
    content: "티켓/좌석은 각자 예매. 공연 전 20분 전 로비에서 집결 후 입장.",
    meetingTime: d(5, 18, 30),
    location: { name: "서초문화예술회관", latitude: 37.4846, longitude: 127.0351 } as any,
    address: "서울특별시 서초구 강남대로 201",
    distanceText: "1.8km",
    capacity: { current: 2, max: 8, total: 8 } as any,
    joinMode: "APPROVAL",
    status: "OPEN",
    myState: { membershipStatus: "NONE", canJoin: true } as any,
    durationMinutes: 150,
    host: HOST_USERS.user3,
  },
  {
    id: "502",
    category: "ETC",
    title: "CGV 강남 IMAX 영화 관람(종료 모임)",
    content: "영화 보고 가볍게 후기 공유하고 해산했어요. (재모집은 새 글로!)",
    meetingTime: d(-4, 19, 0),
    location: { name: "CGV 강남(스타플렉스)", latitude: 37.5014203, longitude: 127.0262062 } as any,
    address: "서울특별시 강남구 강남대로 438 스타플렉스 4, 11층",
    distanceText: "0.4km",
    capacity: { current: 6, max: 6, total: 6 } as any,
    joinMode: "APPROVAL",
    status: "ENDED",
    myState: { membershipStatus: "MEMBER", canJoin: false } as any,
    durationMinutes: 180,
    host: HOST_USERS.user1,
  },

  // -----------------------------
  // HOT (마감 임박용 3개 + 101 포함해서 총 4개)
  // - OPEN + 잔여 2석 이하 + 3시간 이내(h 기반)
  // -----------------------------
  {
    id: "H901",
    category: "STUDY",
    title: "스타벅스 강남R 번개 모각코 60분",
    content: "짧게 집중 작업하고 해산. 좌석 상황에 따라 자리 이동 가능.",
    meetingTime: h(0.4),
    location: { name: "스타벅스 강남R점", latitude: 37.497711, longitude: 127.028439 } as any,
    address: "서울특별시 강남구 강남대로 390",
    distanceText: "0.3km",
    capacity: { current: 3, max: 4, total: 4 } as any, // 잔여 1
    joinMode: "INSTANT",
    status: "OPEN",
    myState: { membershipStatus: "NONE", canJoin: true } as any,
    durationMinutes: 60,
    host: HOST_USERS.user1,
  },
  {
    id: "H902",
    category: "GAMES",
    title: "레드버튼 강남점 라이트 보드게임(90분)",
    content: "가벼운 파티게임 위주. 처음 오셔도 룰 설명해드려요.",
    meetingTime: h(1.4),
    location: { name: "레드버튼 강남점", latitude: 37.5019, longitude: 127.0262 } as any,
    address: "서울특별시 강남구 강남대로 442 1층",
    distanceText: "0.6km",
    capacity: { current: 5, max: 6, total: 6 } as any, // 잔여 1
    joinMode: "APPROVAL",
    status: "OPEN",
    myState: { membershipStatus: "NONE", canJoin: true } as any,
    durationMinutes: 90,
    host: HOST_USERS.user2,
  },
  {
    id: "H903",
    category: "ETC",
    title: "교보문고 강남점 문구/굿즈 구경(45분)",
    content: "짧게 둘러보고 필요한 거 있으면 같이 골라요. 끝나면 자유 해산.",
    meetingTime: h(2.6),
    location: { name: "교보문고 강남점(교보타워)", latitude: 37.5037373, longitude: 127.0240583 } as any,
    address: "서울특별시 서초구 강남대로 465 교보타워 지하 1~지하 2층",
    distanceText: "0.5km",
    capacity: { current: 2, max: 4, total: 4 } as any, // 잔여 2
    joinMode: "INSTANT",
    status: "OPEN",
    myState: { membershipStatus: "NONE", canJoin: true } as any,
    durationMinutes: 45,
    host: HOST_USERS.user3,
  },
];

export default {
  MEETING_COMMENTS_MOCK,
  MEETING_COMMENTS_BY_MEETING_ID,
  getMeetingCommentsMock,
  PARTICIPANTS_MOCK_BY_MEETING_ID,
  getMeetingParticipantsMock,
  HOST_USERS,
  MOCK_MEETINGS_SEED,
};

// 3줄 요약
// - 각 모임별 댓글을 1~2개로 제한하고 톤/상황(OPEN/FULL/STARTED/CANCELED/ENDED)에 맞게 다양화했습니다.
// - 201(내가 호스트)을 승인형(APPROVAL)으로 변경하고 PENDING 참여자 seed를 추가해 호스트 관리 화면에서 대기 목록이 잘 보이게 했습니다.
// - comment/participant clone + id 문자열화로 key 충돌/undefined 방어를 강화했습니다.
