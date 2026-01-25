// src/features/meetings/mocks/meetingMockData.ts

import type { HostSummary, MeetingPost } from "../model/types";
import type { Comment } from "@/features/meetings/model/types";
import type { UserSummary } from "@/shared/model/types";

const makeUser = (u: { id: string; nickname: string; avatarUrl?: string | null }): UserSummary =>
  // 실제 UserSummary가 더 많은 필드를 가질 수 있어, 목업에서는 최소 필드만 안전하게 캐스팅
  ({
    id: u.id,
    nickname: u.nickname,
    avatarUrl: u.avatarUrl ?? undefined,
  } as unknown as UserSummary);

/**
 * ✅ 댓글 목업(일회성 모임에 적합하게 간략/현실적인 톤)
 * - parentId로 대댓글(스레드) 표현
 * - createdAt은 ISO 문자열(+09:00)
 *
 * NOTE:
 * - 특정 모임(예: 상세 화면)에서 comments를 그대로 넣어도 자연스럽게 보이도록
 * - “시간/준비물/집결/노쇼/초보/비용/우천” 같이 일회성 모임에서 실제로 많이 묻는 포인트 위주
 */
export const MEETING_COMMENTS_MOCK: Comment[] = [
  // 1) 집결/시간
  {
    id: "cmt_001",
    content: "집결은 몇 분 전까지 가면 될까요?",
    createdAt: "2026-01-24T18:52:00+09:00",
    author: makeUser({
      id: "user_101",
      nickname: "서연",
      avatarUrl: "https://picsum.photos/seed/user_101/128/128",
    }),
  },
  {
    id: "cmt_002",
    parentId: "cmt_001",
    content: "시작 10분 전까지 오시면 좋아요. 늦으면 채팅으로 위치만 공유드릴게요!",
    createdAt: "2026-01-24T18:56:40+09:00",
    author: makeUser({
      id: "user_host",
      nickname: "호스트민지",
      avatarUrl: "https://picsum.photos/seed/user_host/128/128",
    }),
  },

  // 2) 준비물/복장
  {
    id: "cmt_003",
    content: "준비물 따로 있을까요? 운동화만 챙기면 되나요?",
    createdAt: "2026-01-24T19:10:10+09:00",
    author: makeUser({
      id: "user_202",
      nickname: "준호",
      avatarUrl: "https://picsum.photos/seed/user_202/128/128",
    }),
  },
  {
    id: "cmt_004",
    parentId: "cmt_003",
    content: "운동화/편한 복장만 있으면 충분해요. 필요한 건 제가 여유분 조금 챙겨갈게요.",
    createdAt: "2026-01-24T19:12:50+09:00",
    author: makeUser({
      id: "user_host",
      nickname: "호스트민지",
      avatarUrl: "https://picsum.photos/seed/user_host/128/128",
    }),
  },

  // 3) 비용/정산
  {
    id: "cmt_005",
    content: "비용은 어떻게 정산하나요? 1/N 맞죠?",
    createdAt: "2026-01-24T19:31:00+09:00",
    author: makeUser({
      id: "user_303",
      nickname: "현우",
      avatarUrl: "https://picsum.photos/seed/user_303/128/128",
    }),
  },
  {
    id: "cmt_006",
    parentId: "cmt_005",
    content: "네 1/N이에요. 끝나고 바로 간단히 정산할게요(현금/이체 둘 다 가능).",
    createdAt: "2026-01-24T19:34:20+09:00",
    author: makeUser({
      id: "user_host",
      nickname: "호스트민지",
      avatarUrl: "https://picsum.photos/seed/user_host/128/128",
    }),
  },

];

// ✅ 호스트 유저 데이터 (HostSummary 타입 준수)
export const HOST_USERS: Record<string, HostSummary> = {
  user1: {
    id: "u1",
    nickname: "민수",
    avgRate: 3.5,
    orgTime: 12,
    intro: "운동 끝나고 가볍게 한 잔 좋아해요.",
    avatarUrl: "https://i.pravatar.cc/150?u=u1",
  },
  user2: {
    id: "u2",
    nickname: "보드게임마스터",
    avgRate: 5.0,
    orgTime: 56,
    intro: "전략/파티게임 둘 다 좋아합니다. 초보도 환영!",
    avatarUrl: "https://i.pravatar.cc/150?u=u2",
  },
  user3: {
    id: "u3",
    nickname: "새벽러너",
    avgRate: 2.25,
    orgTime: 3,
    intro: "아침 러닝 루틴 지키는 중이에요.",
    avatarUrl: null,
  },
  user4: {
    id: "u4",
    nickname: "맛집탐방러",
    avgRate: 3.1,
    orgTime: 20,
    intro: "동네 맛집 공유하면서 먹는 거 좋아해요.",
    avatarUrl: "https://i.pravatar.cc/150?u=u4",
  },
  user5: {
    id: "u5",
    nickname: "모각코러",
    avgRate: 3.55,
    orgTime: 8,
    intro: "조용히 집중하는 모임 선호합니다.",
    avatarUrl: "https://i.pravatar.cc/150?u=u5",
  },
  user6: {
    id: "u6",
    nickname: "오늘은한잔",
    avgRate: 1.95,
    orgTime: 1,
    intro: "퇴근 후 가볍게 이야기 나누는 자리 좋아요.",
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

// --- Helpers ---
const now = Date.now();
const h = (hoursFromNow: number) => new Date(now + hoursFromNow * 3600_000).toISOString();
const d = (daysFromNow: number, hour = 12, minute = 0) => {
  const base = new Date(now);
  base.setDate(base.getDate() + daysFromNow);
  base.setHours(hour, minute, 0, 0);
  return base.toISOString();
};

/**
 * ✅ 목업 데이터 정책(정돈 버전)
 * - 강남역/역삼/신논현/선릉/삼성 등 “강남권” 중심으로 구성 (동탄은 2개만 유지)
 * - 실제 모집글처럼: 시간/진행 방식/준비물/비용/매너 등을 간결히 포함
 * - 상태(OPEN/FULL/STARTED/CANCELED/ENDED), joinMode(INSTANT/APPROVAL), myState 케이스 분산
 * - address: 대부분 명시, 일부 null/미포함으로 UI 경계조건 확인
 *
 * NOTE: meetingTime은 toISOString() 기준(UTC, Z)으로 유지.
 *       앱에서 로컬(Asia/Seoul) 표시로 변환하는 흐름을 깨지 않기 위함.
 */
export const MOCK_MEETINGS_SEED: MeetingPost[] = [
  // =========================
  // SPORTS (강남권)
  // =========================
  {
    id: "101",
    category: "SPORTS",
    title: "강남역 배드민턴 더블 2게임",
    content:
      "초보 환영! 워밍업 10분 후 더블로 2게임 정도 돌려요. 셔틀콕 여유분 있습니다(라켓은 개인 지참 권장).",
    meetingTime: h(2),
    location: { name: "강남역 11번 출구 집결", latitude: 37.4986, longitude: 127.0279 },
    address: "서울 서초구 강남대로 396 (강남역 인근)",
    distanceText: "0.4km",
    capacity: { current: 2, max: 4, total: 4 },
    joinMode: "INSTANT",
    status: "OPEN",
    myState: { membershipStatus: "NONE", canJoin: true },
    durationMinutes: 110,
    host: HOST_USERS.user1,
  },
  {
    id: "102",
    category: "SPORTS",
    title: "반포한강 러닝 5km",
    content:
      "페이스 6:00~6:30 정도로 가볍게! 러닝 후 스트레칭 10분, 사진 한 장 찍고 해산합니다. 우천 시 취소.",
    meetingTime: h(5),
    location: { name: "반포한강공원 세빛섬 앞", latitude: 37.5112, longitude: 126.9952 },
    address: null, // ✅ 주소 미정(상세 위치는 채팅에서): 지도/주소 UI 경계조건
    distanceText: "2.6km",
    capacity: { current: 3, max: 8, total: 8 },
    joinMode: "INSTANT",
    status: "OPEN",
    myState: { membershipStatus: "NONE", canJoin: true },
    durationMinutes: 70,
    host: HOST_USERS.user3,
  },
  {
    id: "103",
    category: "SPORTS",
    title: "역삼 탁구 랠리 1시간",
    content:
      "복식/단식 번갈아가며 랠리 위주로 칩니다. 라켓 1~2개 여유 있어요. 매너 플레이만 지켜주세요.",
    meetingTime: h(3.5),
    location: { name: "역삼역 1번 출구 근처", latitude: 37.5006, longitude: 127.0364 },
    address: "서울 강남구 테헤란로 142 (역삼역 인근)",
    distanceText: "0.9km",
    capacity: { current: 4, max: 4, total: 4 },
    joinMode: "INSTANT",
    status: "FULL",
    myState: { membershipStatus: "MEMBER", canJoin: false, reason: "참여중" },
    durationMinutes: 60,
    host: HOST_USERS.user1,
  },
  {
    id: "104",
    category: "SPORTS",
    title: "선릉 농구 3:3 한 판",
    content:
      "하프코트 3:3로 60~90분 정도. 너무 거친 몸싸움은 지양합니다. 기본 스크린/수비 로테이션 가능하신 분.",
    conditions: "경력 1년 이상",
    meetingTime: h(-0.6),
    location: { name: "선릉역 인근 체육시설", latitude: 37.5045, longitude: 127.0488 },
    address: "서울 강남구 선릉로 일대 (선릉역 인근)",
    distanceText: "1.7km",
    capacity: { current: 6, max: 6, total: 6 },
    joinMode: "INSTANT",
    status: "STARTED",
    myState: { membershipStatus: "NONE", canJoin: false, reason: "이미 시작됨" },
    durationMinutes: 90,
    host: HOST_USERS.user1,
  },
  {
    id: "105",
    category: "SPORTS",
    title: "삼성 실내 수영 1시간",
    content:
      "자유수영 1시간 + 정리 10분. 수영모/수경 필수. 호스트 사정으로 일정 변경 가능성이 있어요.",
    meetingTime: d(1, 7, 40),
    location: { name: "삼성역 인근 스포츠센터", latitude: 37.5089, longitude: 127.0631 },
    address: "서울 강남구 봉은사로 일대 (삼성역 인근)",
    distanceText: "2.3km",
    capacity: { current: 1, max: 6, total: 6 },
    joinMode: "APPROVAL",
    status: "CANCELED",
    myState: { membershipStatus: "NONE", canJoin: false, reason: "취소됨" },
    durationMinutes: 60,
    host: HOST_USERS.user6,
  },
  {
    id: "106",
    category: "SPORTS",
    title: "신논현 라이딩 15km",
    content:
      "천천히 달려요(평속 18~22). 중간 휴식 1회. 헬멧/라이트 필수, 안전거리 지켜주세요.",
    meetingTime: d(-1, 8, 0),
    location: { name: "신논현역 3번 출구 집결", latitude: 37.5046, longitude: 127.0246 },
    address: "서울 서초구 강남대로 473 (신논현역 인근)",
    distanceText: "0.6km",
    capacity: { current: 6, max: 6, total: 6 },
    joinMode: "INSTANT",
    status: "ENDED",
    myState: { membershipStatus: "MEMBER", canJoin: false },
    durationMinutes: 120,
    host: HOST_USERS.user3,
  },

  // =========================
  // MEAL (강남권)
  // =========================
  {
    id: "201",
    category: "MEAL",
    title: "강남역 점심 김치찌개",
    content:
      "점심시간에 빠르게 먹고 해산해요(45분 내외). 1/N, 늦참/노쇼는 미리 연락 부탁드립니다.",
    meetingTime: h(1.2),
    location: { name: "강남역 10번 출구", latitude: 37.4980, longitude: 127.0276 },
    address: "서울 서초구 강남대로 405 (강남역 인근)",
    distanceText: "0.3km",
    capacity: { current: 1, max: 4, total: 4 },
    joinMode: "INSTANT",
    status: "OPEN",
    myState: { membershipStatus: "HOST", canJoin: false, reason: "호스트" },
    durationMinutes: 45,
    host: HOST_USERS.me,
  },
  {
    id: "202",
    category: "MEAL",
    title: "역삼역 버거 점심",
    content: "가볍게 먹고 바로 해산합니다. 자리 잡히면 위치 공유할게요. 1/N.",
    meetingTime: h(2.8),
    location: { name: "역삼역 3번 출구", latitude: 37.5006, longitude: 127.0364 },
    address: "서울 강남구 테헤란로 142 (역삼역 인근)",
    distanceText: "0.9km",
    capacity: { current: 2, max: 4, total: 4 },
    joinMode: "INSTANT",
    status: "OPEN",
    myState: { membershipStatus: "NONE", canJoin: true },
    durationMinutes: 55,
    host: HOST_USERS.user4,
  },
  {
    id: "203",
    category: "MEAL",
    title: "선릉 치킨 번개",
    content:
      "퇴근 후 1~1.5시간만! 맥주 1~2잔 정도로 가볍게. 과음/무리한 권유 없이 편하게요. 1/N.",
    meetingTime: h(6),
    location: { name: "선릉역 5번 출구", latitude: 37.5045, longitude: 127.0488 },
    address: "서울 강남구 선릉로 433 (선릉역 인근)",
    distanceText: "1.8km",
    capacity: { current: 6, max: 6, total: 6 },
    joinMode: "INSTANT",
    status: "FULL",
    myState: { membershipStatus: "MEMBER", canJoin: false, reason: "참여중" },
    durationMinutes: 80,
    host: HOST_USERS.user6,
  },
  {
    id: "204",
    category: "MEAL",
    title: "강남역 국밥 한 그릇",
    content:
      "이미 자리 잡았습니다. 20분 내 도착 가능하시면 환영! 합석 불편하신 분은 패스해주세요.",
    meetingTime: h(-0.4),
    location: { name: "강남역 인근 국밥집", latitude: 37.4979, longitude: 127.0283 },
    address: "서울 서초구 서초대로 일대 (강남역 인근)",
    distanceText: "0.5km",
    capacity: { current: 4, max: 4, total: 4 },
    joinMode: "INSTANT",
    status: "STARTED",
    myState: { membershipStatus: "HOST", canJoin: false, reason: "호스트" },
    durationMinutes: 60,
    host: HOST_USERS.me,
  },
  {
    id: "205",
    category: "MEAL",
    title: "삼성 샐러드 런치",
    content:
      "가볍게 샐러드/샌드위치 먹고 산책 10분. 호스트 일정으로 취소될 수 있어 승인제로 받습니다.",
    meetingTime: d(1, 12, 20),
    location: { name: "삼성역 6번 출구", latitude: 37.5089, longitude: 127.0631 },
    address: "서울 강남구 테헤란로 521 (삼성역 인근)",
    distanceText: "2.1km",
    capacity: { current: 2, max: 4, total: 4 },
    joinMode: "APPROVAL",
    status: "CANCELED",
    myState: { membershipStatus: "MEMBER", canJoin: false, reason: "취소됨" },
    durationMinutes: 50,
    host: HOST_USERS.user4,
  },

  // =========================
  // STUDY (강남권)
  // =========================
  {
    id: "301",
    category: "STUDY",
    title: "강남역 모각코 2시간",
    content:
      "각자 작업(대화 최소) + 마지막 10분만 진행 공유. 이어폰/노트북 필수. 자리 확보되면 매장명 공유합니다.",
    conditions: "노트북 필수 / 대화 최소",
    meetingTime: d(1, 19, 30),
    location: { name: "강남역 스터디카페", latitude: 37.4978, longitude: 127.0275 },
    address: "서울 서초구 서초대로 77길 일대 (강남역 인근)",
    distanceText: "0.8km",
    capacity: { current: 2, max: 6, total: 6 },
    joinMode: "APPROVAL",
    status: "OPEN",
    myState: { membershipStatus: "PENDING", canJoin: false, reason: "승인 대기중" },
    durationMinutes: 120,
    host: HOST_USERS.user5,
  },
  {
    id: "302",
    category: "STUDY",
    title: "역삼 카페 모각코 90분",
    content: "각자 작업하고 30분마다 한 번씩 짧게 체크인합니다. 통화/화상회의는 어렵습니다.",
    conditions: "노트북 필수 / 통화 금지",
    meetingTime: d(1, 14, 0),
    location: { name: "역삼역 인근 카페", latitude: 37.5006, longitude: 127.0364 },
    address: "서울 강남구 테헤란로 146 (역삼역 인근)",
    distanceText: "1.0km",
    capacity: { current: 1, max: 5, total: 5 },
    joinMode: "APPROVAL",
    status: "OPEN",
    myState: { membershipStatus: "HOST", canJoin: false, reason: "호스트" },
    durationMinutes: 90,
    host: HOST_USERS.me,
  },
  {
    id: "303",
    category: "STUDY",
    title: "선릉 토익 스터디",
    content:
      "LC 1세트 + RC 1세트 풀고 오답만 공유합니다. 노쇼 방지로 승인제(간단한 소개 부탁드려요).",
    meetingTime: d(2, 10, 0),
    location: { name: "선릉 스터디룸", latitude: 37.5045, longitude: 127.0488 },
    address: "서울 강남구 선릉로 225 (선릉역 인근)",
    distanceText: "1.9km",
    capacity: { current: 6, max: 6, total: 6 },
    joinMode: "APPROVAL",
    status: "FULL",
    myState: { membershipStatus: "NONE", canJoin: false, reason: "정원마감" },
    durationMinutes: 150,
    host: HOST_USERS.user5,
  },
  {
    id: "304",
    category: "STUDY",
    title: "삼성 집중 작업 90분",
    content:
      "이미 시작했어요. 조용히 들어오셔서 작업만 하시면 됩니다(간단 인사만). 방해되는 대화는 어려워요.",
    meetingTime: h(-1.1),
    location: { name: "삼성동 공유오피스", latitude: 37.5081, longitude: 127.0638 },
    address: "서울 강남구 봉은사로 524 (삼성역 인근)",
    distanceText: "2.4km",
    capacity: { current: 5, max: 6, total: 6 },
    joinMode: "APPROVAL",
    status: "STARTED",
    myState: { membershipStatus: "MEMBER", canJoin: false },
    durationMinutes: 90,
    host: HOST_USERS.user5,
  },

  // =========================
  // GAMES (강남권)
  // =========================
  {
    id: "401",
    category: "GAMES",
    title: "강남 보드게임 한 판",
    content:
      "파티게임/가벼운 전략 섞어서 진행합니다. 초보 환영(룰 설명 가능). 늦으면 미리 연락 부탁드려요.",
    meetingTime: d(1, 16, 0),
    location: { name: "강남역 보드게임 카페", latitude: 37.4974, longitude: 127.0292 },
    address: "서울 서초구 강남대로 420 (강남역 인근)",
    distanceText: "0.9km",
    capacity: { current: 2, max: 6, total: 6 },
    joinMode: "APPROVAL",
    status: "OPEN",
    myState: { membershipStatus: "NONE", canJoin: true },
    durationMinutes: 180,
    host: HOST_USERS.user2,
  },
  {
    id: "402",
    category: "GAMES",
    title: "선릉 커맨더 한 판",
    content:
      "덱 파워는 너무 쎄지 않게 맞춰요. 기본 매너(턴 스킵/과한 지연 금지) 부탁드립니다.",
    conditions: "커맨더 덱 보유",
    meetingTime: d(2, 20, 0),
    location: { name: "선릉 카드게임 매장", latitude: 37.5045, longitude: 127.0488 },
    address: "서울 강남구 테헤란로 322 (선릉역 인근)",
    distanceText: "1.6km",
    capacity: { current: 2, max: 4, total: 4 },
    joinMode: "APPROVAL",
    status: "OPEN",
    myState: { membershipStatus: "PENDING", canJoin: false, reason: "승인 대기중" },
    durationMinutes: 180,
    host: HOST_USERS.user2,
  },
  {
    id: "403",
    category: "GAMES",
    title: "역삼 마리오카트 미니 토너먼트",
    content:
      "이미 시작했습니다. 관전/대기 후 빈 자리 생기면 교대 참여 가능해요. 음료는 각자 구매 부탁!",
    meetingTime: h(-0.5),
    location: { name: "역삼 게임 라운지", latitude: 37.5002, longitude: 127.0359 },
    address: "서울 강남구 테헤란로 130 (역삼역 인근)",
    distanceText: "1.1km",
    capacity: { current: 4, max: 4, total: 4 },
    joinMode: "INSTANT",
    status: "STARTED",
    myState: { membershipStatus: "MEMBER", canJoin: false },
    durationMinutes: 90,
    host: HOST_USERS.user2,
  },
  {
    id: "404",
    category: "GAMES",
    title: "강남 방탈출 팟",
    content:
      "예약 이슈로 취소되었습니다. 다음 일정 다시 올릴게요(인원 맞춰지면 바로 예약 진행).",
    meetingTime: d(1, 22, 0),
    location: { name: "강남역 방탈출 카페", latitude: 37.4984, longitude: 127.0278 },
    // ✅ address 키 자체 생략: UI에서 '주소 없음' 처리 확인용
    distanceText: "0.5km",
    capacity: { current: 2, max: 6, total: 6 },
    joinMode: "APPROVAL",
    status: "CANCELED",
    myState: { membershipStatus: "NONE", canJoin: false, reason: "취소됨" },
    durationMinutes: 80,
    host: HOST_USERS.user2,
  },
  {
    id: "405",
    category: "GAMES",
    title: "신논현 보드게임 정모",
    content:
      "루미큐브/스플렌더/스컬 위주로 진행했습니다. 다음 모임 때는 전략게임도 섞어볼게요.",
    meetingTime: d(-3, 19, 30),
    location: { name: "신논현 보드게임 카페", latitude: 37.5046, longitude: 127.0246 },
    address: "서울 서초구 강남대로 477 (신논현역 인근)",
    distanceText: "0.7km",
    capacity: { current: 6, max: 6, total: 6 },
    joinMode: "APPROVAL",
    status: "ENDED",
    myState: { membershipStatus: "HOST", canJoin: false, reason: "호스트" },
    durationMinutes: 180,
    host: HOST_USERS.me,
  },

  // =========================
  // 동탄 (2개만 유지)
  // =========================
  {
    id: "501",
    category: "SPORTS",
    title: "동탄호수공원 러닝 4km",
    content:
      "가볍게 뛰고 스트레칭까지 진행합니다. 초보/걷뛰 모두 가능. 우천 시 당일 오전에 공지 후 취소.",
    meetingTime: d(2, 6, 30),
    location: { name: "동탄호수공원 집결", latitude: 37.2048, longitude: 127.1035 },
    address: "경기 화성시 동탄호수공원 일대",
    distanceText: "1.3km",
    capacity: { current: 2, max: 8, total: 8 },
    joinMode: "INSTANT",
    status: "OPEN",
    myState: { membershipStatus: "NONE", canJoin: true },
    durationMinutes: 55,
    host: HOST_USERS.user3,
  },
  {
    id: "531",
    category: "GAMES",
    title: "동탄 보드게임 모임",
    content:
      "파티게임 위주로 가볍게 진행했습니다. 다음에는 2차로 카페도 갈 듯(선택).",
    meetingTime: d(-4, 19, 0),
    location: { name: "동탄 보드게임 카페", latitude: 37.2042, longitude: 127.0697 },
    address: "경기 화성시 동탄중심상가 일대",
    distanceText: "1.1km",
    capacity: { current: 6, max: 6, total: 6 },
    joinMode: "APPROVAL",
    status: "ENDED",
    myState: { membershipStatus: "MEMBER", canJoin: false },
    durationMinutes: 180,
    host: HOST_USERS.user2,
  },
];
