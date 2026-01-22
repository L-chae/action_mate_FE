// src/features/meetings/mocks/meetingMockData.ts
import type { HostSummary, MeetingPost } from "../model/types";

// ✅ 1. 호스트 유저 데이터 (수정: avatarUrl은 null 또는 string)
export const HOST_USERS: Record<string, HostSummary> = {
  user1: {
    id: "u1",
    nickname: "민수",
    mannerTemperature: 37.5,
    praiseCount: 12,
    intro: "운동 끝나고 맥주 한잔 좋아해요 🍺",
    avatarUrl: "https://i.pravatar.cc/150?u=u1",
  },
  user2: {
    id: "u2",
    nickname: "보드게임마스터",
    mannerTemperature: 42.0,
    praiseCount: 56,
    intro: "전략 게임 전문입니다. 초보 환영!",
    avatarUrl: "https://i.pravatar.cc/150?u=u2",
  },
  user3: {
    id: "u3",
    nickname: "새벽러너",
    mannerTemperature: 36.5,
    praiseCount: 3,
    intro: "매일 아침 6시 뜁니다.",
    avatarUrl: null, // 프사는 없을 수 있음
  },
  user4: {
    id: "u4",
    nickname: "맛집탐방러",
    mannerTemperature: 38.2,
    praiseCount: 20,
    intro: "맛없는 건 안 먹어요 🙅‍♂️",
    avatarUrl: "https://i.pravatar.cc/150?u=u4",
  },
  user5: {
    id: "u5",
    nickname: "모각코러",
    mannerTemperature: 39.1,
    praiseCount: 8,
    intro: "집중모드 환영. 말없이 각자 코딩해요.",
    avatarUrl: "https://i.pravatar.cc/150?u=u5",
  },
  user6: {
    id: "u6",
    nickname: "오늘은한잔",
    mannerTemperature: 35.9,
    praiseCount: 1,
    intro: "퇴근 후 가볍게 이야기 나눠요.",
    avatarUrl: null,
  },
  me: {
    id: "me",
    nickname: "나(호스트)",
    mannerTemperature: 36.8,
    praiseCount: 0,
    intro: "내가 만든 모임이에요 🙂",
    avatarUrl: "https://i.pravatar.cc/150?u=me",
  },
};

// --- Helpers ---
const now = Date.now();
const h = (hoursFromNow: number) => new Date(now + hoursFromNow * 3600_000).toISOString();
const d = (daysFromNow: number, hour = 12, minute = 0) => {
  const base = new Date(now);
  base.setDate(base.getDate() + daysFromNow);
  base.setHours(hour, minute, 0, 0);
  return base.toISOString();
};

// ✅ 2. 모임 데이터 (수정: location, capacity 객체 구조화)
export const MOCK_MEETINGS_SEED: MeetingPost[] = [
  {
    id: "101",
    category: "SPORTS",
    title: "🏸 배드민턴 2게임만 (초보 환영)",
    content: "라켓 여분 있어요! 몸만 오세요.",
    meetingTime: h(2),
    
    // ✅ 구조 변경됨
    location: {
      name: "잠원지구 3주차장",
      lat: 37.5195,
      lng: 127.0093,
    },
    distanceText: "0.6km",

    // ✅ 구조 변경됨
    capacity: {
      current: 2, // capacityJoined -> current
      total: 4,   // capacityTotal -> total
    },

    joinMode: "INSTANT",
    status: "OPEN",
    myState: { membershipStatus: "NONE", canJoin: true },
    durationMinutes: 120,
    host: HOST_USERS.user1,
  },
  {
    id: "102",
    category: "MEAL",
    title: "🍔 강남 버거 같이 먹을 분",
    content: "가볍게 점심!",
    meetingTime: h(1),
    
    location: {
      name: "강남역 근처 버거집",
      lat: 37.4981,
      lng: 127.0277,
    },
    distanceText: "1.1km",

    capacity: {
      current: 1,
      total: 4,
    },

    joinMode: "INSTANT",
    status: "OPEN",
    myState: { membershipStatus: "NONE", canJoin: true },
    durationMinutes: 60,
    host: HOST_USERS.user4,
  },
  {
    id: "103",
    category: "STUDY",
    title: "📚 모각코 (조용히 각자)",
    content: "룰: 서로 말 걸기 X, 필요 시 채팅으로.",
    conditions: "노트북 필수 / 조용히 작업",
    meetingTime: d(1, 14, 0),
    
    location: {
      name: "스타벅스 강남R점",
      lat: 37.499,
      lng: 127.03,
    },
    distanceText: "0.9km",

    capacity: {
      current: 2,
      total: 6,
    },

    joinMode: "APPROVAL",
    status: "OPEN",
    myState: { membershipStatus: "PENDING", canJoin: false, reason: "승인 대기중" },
    durationMinutes: 180,
    host: HOST_USERS.user5,
  },
  {
    id: "104",
    category: "GAMES",
    title: "🎲 보드게임 가볍게 한 판",
    content: "전략/파티게임 섞어서 해요!",
    conditions: "기본 룰 안내 가능 / 초보 환영",
    meetingTime: d(1, 15, 0),
    
    location: {
      name: "성수 보드게임 카페",
      lat: 37.5446,
      lng: 127.0559,
    },
    distanceText: "2.0km",

    capacity: {
      current: 1,
      total: 5,
    },

    joinMode: "APPROVAL",
    status: "OPEN",
    myState: { membershipStatus: "NONE", canJoin: true },
    durationMinutes: 180,
    host: HOST_USERS.user2,
  },
  {
    id: "105",
    category: "MEAL",
    title: "🍜 홍대 라멘 번개",
    content: "맛집이라 웨이팅 있을 수 있어요.",
    meetingTime: h(3),
    
    location: {
      name: "홍대 라멘집",
      lat: 37.5558,
      lng: 126.9225,
    },
    distanceText: "1.2km",

    capacity: {
      current: 4,
      total: 4,
    },

    joinMode: "INSTANT",
    status: "FULL",
    myState: { membershipStatus: "NONE", canJoin: false, reason: "정원마감" },
    durationMinutes: 90,
    host: HOST_USERS.user4,
  },
  {
    id: "106",
    category: "SPORTS",
    title: "🏃 한강 러닝 5km (600~630)",
    content: "가볍게 뛰고 스트레칭까지!",
    meetingTime: h(4),
    
    location: {
      name: "반포 나들목",
      lat: 37.509,
      lng: 126.995,
    },
    distanceText: "2.4km",

    capacity: {
      current: 3,
      total: 6,
    },

    joinMode: "INSTANT",
    status: "OPEN",
    myState: { membershipStatus: "NONE", canJoin: true },
    durationMinutes: 60,
    host: HOST_USERS.user3,
  },
  {
    id: "107",
    category: "STUDY",
    title: "🧑‍💻 판교 카페 사이드프로젝트",
    content: "각자 할 일 하고 30분마다 공유해요.",
    conditions: "간단한 자기소개 필수",
    meetingTime: d(2, 13, 0),
    
    location: {
      name: "판교역 근처 카페",
      lat: 37.3947,
      lng: 127.1112,
    },
    distanceText: "0.8km",

    capacity: {
      current: 2,
      total: 5,
    },

    joinMode: "APPROVAL",
    status: "OPEN",
    myState: { membershipStatus: "NONE", canJoin: true },
    durationMinutes: 240,
    host: HOST_USERS.user5,
  },
  {
    id: "108",
    category: "GAMES",
    title: "🎮 광교에서 마리오카트",
    content: "2명 더 오면 토너먼트!",
    meetingTime: d(1, 19, 30),
    
    location: {
      name: "광교 카페",
      lat: 37.2919,
      lng: 127.0455,
    },
    distanceText: "1.5km",

    capacity: {
      current: 3,
      total: 4,
    },

    joinMode: "INSTANT",
    status: "OPEN",
    myState: { membershipStatus: "NONE", canJoin: true },
    durationMinutes: 120,
    host: HOST_USERS.user2,
  },
  {
    id: "201",
    category: "MEAL",
    title: "✍️ 강남역 점심 김치찌개 같이 먹어요",
    content: "혼밥 싫어서 만들었어요. 40분 정도만 가볍게!",
    meetingTime: h(0.8),
    
    location: {
      name: "강남역 11번 출구 근처",
      lat: 37.4986,
      lng: 127.0279,
    },
    distanceText: "0.3km",

    capacity: {
      current: 1,
      total: 4,
    },

    joinMode: "INSTANT",
    status: "OPEN",
    myState: { membershipStatus: "HOST", canJoin: false, reason: "호스트" },
    durationMinutes: 40,
    host: HOST_USERS.me,
  },
  {
    id: "202",
    category: "STUDY",
    title: "✍️ 저녁 모각코 2시간 (초집중)",
    content: "각자 할 일 하고 마지막 10분만 공유해요.",
    conditions: "노트북 필수 / 통화 금지 / 대화 최소",
    meetingTime: d(1, 20, 0),
    
    location: {
      name: "서초 카페 (조용한 곳)",
      lat: 37.4929,
      lng: 127.0156,
    },
    distanceText: "0.7km",

    capacity: {
      current: 1,
      total: 6,
    },

    joinMode: "APPROVAL",
    status: "OPEN",
    myState: { membershipStatus: "HOST", canJoin: false, reason: "호스트" },
    durationMinutes: 120,
    host: HOST_USERS.me,
  },
  // ✅ [NEW] 평가 테스트용 2: 3일 전 끝난 모임 (내가 참여함)
  // =========================================================
  // ✅ ENDED 모임 추가 (평가 테스트용)
  // - 조건: status === "ENDED" && myState.membershipStatus === "MEMBER"
  // - NotificationsScreen에서 "평가할 모임"으로 잡힘
  // =========================================================
// -----------------------------------------------------
  // ✅ 평가 테스트용 (ENDED & MEMBER)
  // -----------------------------------------------------
  {
    id: "301",
    category: "SPORTS",
    title: "🏸 (종료) 배드민턴 1시간 번개",
    content: "끝나고 간단히 스트레칭만 하고 해산했어요.",
    meetingTime: h(-6),
    location: { name: "잠원체육관", lat: 37.5188, lng: 127.0112 }, // ✅ 객체 구조 변경
    distanceText: "0.8km",
    capacity: { current: 4, total: 4 }, // ✅ 객체 구조 변경
    joinMode: "INSTANT",
    status: "ENDED",
    myState: { membershipStatus: "MEMBER", canJoin: false },
    durationMinutes: 60,
    host: HOST_USERS.user1,
  },
  {
    id: "302",
    category: "MEAL",
    title: "🍔 (종료) 강남 버거 점심 모임",
    content: "가볍게 먹고 해산했어요. 다들 매너 좋았음!",
    meetingTime: h(-24),
    location: { name: "강남역 버거집", lat: 37.4982, lng: 127.0276 },
    distanceText: "1.0km",
    capacity: { current: 3, total: 4 },
    joinMode: "INSTANT",
    status: "ENDED",
    myState: { membershipStatus: "MEMBER", canJoin: false },
    durationMinutes: 50,
    host: HOST_USERS.user4,
  },
  {
    id: "303",
    category: "GAMES",
    title: "🎲 (종료) 성수 보드게임 카페",
    content: "루미큐브/스플렌더 했고 재밌었어요.",
    conditions: "초보 환영 / 룰 설명 가능",
    meetingTime: d(-2, 18, 30),
    location: { name: "성수 보드게임 카페", lat: 37.5447, lng: 127.056 },
    distanceText: "2.1km",
    capacity: { current: 5, total: 5 },
    joinMode: "APPROVAL",
    status: "ENDED",
    myState: { membershipStatus: "MEMBER", canJoin: false },
    durationMinutes: 180,
    host: HOST_USERS.user2,
  },
  {
    id: "304",
    category: "STUDY",
    title: "🧑‍💻 (종료) 판교 카페 모각코",
    content: "각자 집중하고 마지막 10분 공유했어요.",
    conditions: "간단한 자기소개 / 조용히 작업",
    meetingTime: d(-1, 14, 0),
    location: { name: "판교역 근처 카페", lat: 37.3949, lng: 127.111 },
    distanceText: "0.9km",
    capacity: { current: 4, total: 6 },
    joinMode: "APPROVAL",
    status: "ENDED",
    myState: { membershipStatus: "MEMBER", canJoin: false },
    durationMinutes: 120,
    host: HOST_USERS.user5,
  },
  {
    id: "305",
    category: "SPORTS",
    title: "🏃 (종료) 한강 러닝 5km",
    content: "페이스 맞춰서 잘 뛰었어요. 다음에 또!",
    meetingTime: h(-3),
    location: { name: "반포 나들목", lat: 37.5091, lng: 126.9951 },
    distanceText: "2.3km",
    capacity: { current: 6, total: 6 },
    joinMode: "INSTANT",
    status: "ENDED",
    myState: { membershipStatus: "MEMBER", canJoin: false },
    durationMinutes: 65,
    host: HOST_USERS.user3,
  },
  {
    id: "306",
    category: "MEAL",
    title: "🍝 (종료) 동탄 파스타 모임",
    content: "대화도 재밌었고 음식도 맛있었어요.",
    conditions: "노쇼 금지 / 시간 엄수",
    meetingTime: d(-3, 19, 0),
    location: { name: "동탄 타임테라스", lat: 37.2046, lng: 127.0666 },
    distanceText: "600m",
    capacity: { current: 4, total: 4 },
    joinMode: "APPROVAL",
    status: "ENDED",
    myState: { membershipStatus: "MEMBER", canJoin: false },
    durationMinutes: 90,
    host: HOST_USERS.user6,
  },
];
