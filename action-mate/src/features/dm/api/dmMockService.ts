// ============================================================================
// src/features/dm/api/dmMockService.ts
// ============================================================================

import type { ISODateTimeString } from "@/shared/model/types";
import type { DMMessage, DMThread } from "../model/types";
import { nowIso as nowIsoShared } from "@/shared/utils/timeText";
import type { DmService } from "./dmApi";

// -----------------------------------------------------------------------------
// Shared helpers (Mock only)
// -----------------------------------------------------------------------------
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

const toMs = (iso?: string) => {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
};

const nowIso = (): ISODateTimeString => {
  const v = typeof nowIsoShared === "function" ? nowIsoShared() : new Date().toISOString();
  return (String(v || new Date().toISOString()) as unknown) as ISODateTimeString;
};

function ensureLastMessage(threadId: string, msgs: DMMessage[] | undefined): DMMessage {
  const list = Array.isArray(msgs) ? msgs : [];
  const last = [...list].sort((a, b) => toMs((b as any)?.createdAt) - toMs((a as any)?.createdAt))[0];

  if (last) {
    return {
      ...(last as any),
      threadId: String((last as any)?.threadId ?? threadId),
      type: ((last as any)?.type ?? "TEXT") as any,
      createdAt: (((last as any)?.createdAt ? (last as any).createdAt : nowIso()) as unknown) as ISODateTimeString,
      isRead: typeof (last as any)?.isRead === "boolean" ? (last as any).isRead : true,
      text: typeof (last as any)?.text === "string" ? (last as any).text : "",
      senderId: (((last as any)?.senderId ?? "me") as unknown) as any,
    } as DMMessage;
  }

  return {
    id: `sys_${Date.now()}`,
    threadId: String(threadId),
    type: "SYSTEM" as any,
    text: "대화를 시작해보세요.",
    senderId: "me" as any,
    createdAt: nowIso(),
    isRead: true,
  } as DMMessage;
}

function cloneThread(t: DMThread): DMThread {
  return {
    ...(t as any),
    otherUser: { ...((t as any)?.otherUser ?? {}) },
    lastMessage: { ...((t as any)?.lastMessage ?? {}) },
    relatedMeeting: (t as any)?.relatedMeeting ? { ...((t as any)?.relatedMeeting ?? {}) } : undefined,
  } as DMThread;
}

function cloneMessage(m: DMMessage): DMMessage {
  return {
    ...(m as any),
    id: String((m as any)?.id ?? `m_${Date.now()}`),
    threadId: String((m as any)?.threadId ?? "unknown"),
    type: ((m as any)?.type ?? "TEXT") as any,
    text: typeof (m as any)?.text === "string" ? (m as any).text : "",
    createdAt: (((m as any)?.createdAt ? (m as any).createdAt : nowIso()) as unknown) as ISODateTimeString,
    isRead: typeof (m as any)?.isRead === "boolean" ? (m as any).isRead : true,
    senderId: (((m as any)?.senderId ?? "me") as unknown) as any,
  } as DMMessage;
}

// -----------------------------------------------------------------------------
// MOCK DATA (일회성 모임 느낌의 대화 내역을 "많이" 제공)
// - meetingId 별로 1개 thread, 짧은 메시지 여러 개
// - 일부는 unread(상대방 최신 메시지 1~2개) 유지
// -----------------------------------------------------------------------------
const MY_ID = "me";
const SYS_ID = "system";
const baseNow = Date.now();

const minAgo = (m: number) => new Date(baseNow - m * 60_000).toISOString() as ISODateTimeString;
const hourAgo = (h: number) => new Date(baseNow - h * 3600_000).toISOString() as ISODateTimeString;
const dayAgo = (d: number) => new Date(baseNow - d * 24 * 3600_000).toISOString() as ISODateTimeString;

type DMUserLite = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
};

const OTHER_USERS: DMUserLite[] = [
  { id: "user_701", nickname: "윤아", avatarUrl: "https://picsum.photos/seed/user_701/128/128" },
  { id: "user_702", nickname: "도윤", avatarUrl: "https://picsum.photos/seed/user_702/128/128" },
  { id: "user_703", nickname: "지훈", avatarUrl: "https://picsum.photos/seed/user_703/128/128" },
  { id: "user_704", nickname: "서연", avatarUrl: "https://picsum.photos/seed/user_704/128/128" },
  { id: "user_705", nickname: "민재", avatarUrl: "https://picsum.photos/seed/user_705/128/128" },
  { id: "user_706", nickname: "하늘", avatarUrl: "https://picsum.photos/seed/user_706/128/128" },
  { id: "user_707", nickname: "유진", avatarUrl: "https://picsum.photos/seed/user_707/128/128" },
  { id: "user_708", nickname: "태오", avatarUrl: "https://picsum.photos/seed/user_708/128/128" },
  { id: "user_709", nickname: "채린", avatarUrl: "https://picsum.photos/seed/user_709/128/128" },
  { id: "user_710", nickname: "지수", avatarUrl: "https://picsum.photos/seed/user_710/128/128" },
  { id: "user_711", nickname: "현우", avatarUrl: "https://picsum.photos/seed/user_711/128/128" },
  { id: "user_712", nickname: "소민", avatarUrl: "https://picsum.photos/seed/user_712/128/128" },
];

const pickOther = (seed: string): DMUserLite => {
  const s = String(seed ?? "");
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return OTHER_USERS[h % OTHER_USERS.length] ?? OTHER_USERS[0];
};

type MsgStep = {
  from: "me" | "other" | "system";
  text: string;
  at: ISODateTimeString;
  isRead?: boolean;
  type?: "TEXT" | "SYSTEM";
};

const mkThreadMsgs = (threadId: string, meetingId: string, steps: MsgStep[]): DMMessage[] => {
  const otherId = pickOther(meetingId)?.id ?? "unknown";

  const normalized = (Array.isArray(steps) ? steps : [])
    .filter((s) => typeof s?.text === "string" && String(s.text).trim().length > 0)
    .map((s, idx) => {
      const from = s?.from ?? "other";
      const senderId =
        from === "me" ? MY_ID : from === "system" ? SYS_ID : (otherId as any);

      const type = (s?.type ?? (from === "system" ? "SYSTEM" : "TEXT")) as any;

      // system은 unread에 포함되지 않게 기본 read 처리
      const isReadDefault = from === "system" ? true : true;

      return {
        id: `${threadId}-${idx + 1}`,
        threadId,
        type,
        text: String(s.text),
        senderId: senderId as any,
        createdAt: (s?.at ?? nowIso()) as any,
        isRead: typeof s?.isRead === "boolean" ? s.isRead : isReadDefault,
      } as DMMessage;
    })
    .sort((a, b) => toMs((a as any)?.createdAt) - toMs((b as any)?.createdAt));

  return normalized;
};

// meetingId 별 시나리오 (짧고 일회성 모임 느낌)
const SCENARIOS: Record<string, MsgStep[]> = {
  // 101: 배드민턴(서초구민체육센터)
  "101": [
    { from: "system", text: "모임 채팅이 열렸어요. 시간/장소를 확인해보세요.", at: hourAgo(6.5), type: "SYSTEM" },
    { from: "me", text: "안녕하세요! 오늘 배드민턴 참여 가능할까요?", at: hourAgo(6.4) },
    { from: "other", text: "가능해요 🙂 라켓 있으시면 가져오시면 좋아요.", at: hourAgo(6.35) },
    { from: "me", text: "네 라켓 챙겨갈게요. 집결 위치는 어디일까요?", at: hourAgo(6.2) },
    { from: "other", text: "서초구민체육센터 1층 로비요. 시작 10분 전까지!", at: hourAgo(6.1) },
    { from: "me", text: "확인했습니다. 실내화도 챙기겠습니다.", at: hourAgo(5.9) },
    { from: "other", text: "좋아요! 혹시 늦으면 채팅 주세요.", at: hourAgo(5.85) },
    { from: "me", text: "출발했어요. 15분 정도 걸릴 것 같아요.", at: minAgo(58) },
    { from: "other", text: "오케이! 로비 왼쪽 벤치 쪽에 있을게요.", at: minAgo(54) },
    { from: "me", text: "도착했습니다. 로비 왼쪽 맞나요?", at: minAgo(12) },
    { from: "other", text: "네! 지금 바로 앞에요. 인사해요!", at: minAgo(11), isRead: false },
  ],

  // 201: 점심(대운식당) - 내가 호스트
  "201": [
    { from: "system", text: "모임 채팅이 열렸어요. 원활한 진행을 위해 예의를 지켜주세요.", at: dayAgo(1), type: "SYSTEM" },
    { from: "other", text: "안녕하세요! 점심 모임 아직 자리 있나요?", at: dayAgo(1) },
    { from: "me", text: "네 1자리 있어요. 12:10에 가게 앞에서 뵐까요?", at: dayAgo(1) },
    { from: "other", text: "좋아요! 혹시 메뉴 추천 있나요?", at: hourAgo(22) },
    { from: "me", text: "생태탕/동태탕 인기예요. 빨리 먹고 해산할게요.", at: hourAgo(21.9) },
    { from: "other", text: "네! 12시쯤 강남역 도착 예정이에요.", at: hourAgo(2.8) },
    { from: "me", text: "가게 앞에서 기다릴게요. 도착하면 톡 주세요.", at: hourAgo(2.7) },
    { from: "other", text: "지금 2번 출구 쪽이에요. 5분 내 도착!", at: minAgo(18) },
    { from: "me", text: "확인! 저는 가게 입구 오른쪽에 서있을게요(회색 코트).", at: minAgo(16) },
  ],

  // 202: 치맥(꼬끼오 장작구이)
  "202": [
    { from: "system", text: "모임 채팅이 열렸어요.", at: hourAgo(10.2), type: "SYSTEM" },
    { from: "me", text: "치맥 모임 참여하고 싶어요. 인원 마감됐나요?", at: hourAgo(10.1) },
    { from: "other", text: "아직 2자리 있어요! 20:10에 입장합니다.", at: hourAgo(10.0) },
    { from: "me", text: "오케이! 혹시 늦으면 먼저 주문하셔도 돼요.", at: hourAgo(9.95) },
    { from: "other", text: "네! 닭은 기본+매콤 반반으로 생각 중이에요.", at: hourAgo(9.9) },
    { from: "me", text: "좋습니다. 저는 맥주로 갈게요.", at: hourAgo(9.85) },
    { from: "other", text: "자리 잡았어요. 들어오면 '모임'이라고 말하고 2층 창가 쪽!", at: minAgo(38) },
    { from: "me", text: "방금 도착했어요. 2층 올라갑니다.", at: minAgo(34) },
    { from: "other", text: "오케이! 테이블 12번이에요.", at: minAgo(33), isRead: false },
  ],

  // 203: 홍콩반점(승인형) - 승인/자리/정산 같은 디테일
  "203": [
    { from: "system", text: "호스트가 참여 요청을 확인 중이에요.", at: dayAgo(2), type: "SYSTEM" },
    { from: "me", text: "안녕하세요! 짬뽕 모임 신청했습니다.", at: dayAgo(2) },
    { from: "other", text: "확인했어요 🙂 승인 완료! 12:20에 매장 앞에서 모일게요.", at: dayAgo(2) },
    { from: "me", text: "감사합니다. 혹시 매운맛 조절 가능할까요?", at: dayAgo(2) },
    { from: "other", text: "가능해요. 덜맵게 요청하면 됩니다!", at: dayAgo(2) },
    { from: "me", text: "오케이! 저는 덜맵게로 부탁드릴게요.", at: dayAgo(1.9) },
    { from: "other", text: "가게 안쪽 4인석 잡아둘게요. 오면 이름만 말해주시면 돼요.", at: hourAgo(5.4) },
    { from: "me", text: "지금 강남역 도착했어요. 10분 내 도착!", at: minAgo(62) },
    { from: "other", text: "좋아요. 저는 입구 안쪽 오른쪽 테이블에 있어요.", at: minAgo(58) },
    { from: "me", text: "도착! 들어왔어요.", at: minAgo(22) },
    { from: "other", text: "여기요 👋 (창가 옆)", at: minAgo(21), isRead: false },
  ],

  // 301: 역삼도서관 모각코(승인형)
  "301": [
    { from: "system", text: "조용한 공간에서는 대화량을 줄여주세요.", at: dayAgo(3), type: "SYSTEM" },
    { from: "me", text: "모각코 신청했어요. 좌석은 어디로 잡을까요?", at: dayAgo(3) },
    { from: "other", text: "승인 완료! 5층 열람실 옆 테이블로 오시면 돼요.", at: dayAgo(3) },
    { from: "me", text: "콘센트 있는 자리일까요?", at: dayAgo(2.95) },
    { from: "other", text: "테이블 쪽에 있어요. 멀티탭 하나 가져올게요.", at: dayAgo(2.9) },
    { from: "me", text: "감사합니다. 저는 19:20쯤 도착할 듯해요.", at: hourAgo(30) },
    { from: "other", text: "네! 도착하면 조용히 메시지 주세요.", at: hourAgo(29.8) },
    { from: "me", text: "지금 도착했어요. 5층 올라갈게요.", at: minAgo(95) },
    { from: "other", text: "테이블 3번 쪽이에요. 조용히 손만 흔들어 주세요!", at: minAgo(93) },
  ],

  // 302: 교보문고 책/스터디(즉시)
  "302": [
    { from: "system", text: "서로의 시간을 존중해요.", at: dayAgo(1), type: "SYSTEM" },
    { from: "me", text: "교보 강남 스터디 참여해도 될까요?", at: dayAgo(1) },
    { from: "other", text: "물론이죠! 14:00에 B1 카페 옆에서 만나요.", at: dayAgo(1) },
    { from: "me", text: "오케이. 저는 개발 서적 쪽 구경하려고요.", at: hourAgo(18) },
    { from: "other", text: "저는 인문/에세이 쪽! 1시간 정도 보고 짧게 공유해요.", at: hourAgo(17.8) },
    { from: "me", text: "좋습니다. 혹시 찾는 책 있으면 미리 말해도 될까요?", at: hourAgo(17.7) },
    { from: "other", text: "네! 제목 보내주시면 비슷한 거 같이 찾아드릴게요.", at: hourAgo(17.65) },
    { from: "me", text: "‘클린 아키텍처’ 쪽 보고 싶어요.", at: hourAgo(17.6) },
    { from: "other", text: "좋아요. 그럼 B1 IT서적 코너 근처에서 봬요.", at: minAgo(44), isRead: false },
  ],

  // 303: 스타벅스 강남R 집중 작업(즉시)
  "303": [
    { from: "system", text: "모임 채팅이 열렸어요.", at: hourAgo(3.2), type: "SYSTEM" },
    { from: "me", text: "저 오늘 90분 작업 모임 참여합니다!", at: hourAgo(3.1) },
    { from: "other", text: "좋아요. 자리는 2층 중간 큰 테이블이에요.", at: hourAgo(3.0) },
    { from: "me", text: "콘센트 가까운가요?", at: hourAgo(2.95) },
    { from: "other", text: "창가 쪽에 있어요. 자리 상황 봐서 이동할게요.", at: hourAgo(2.9) },
    { from: "me", text: "지금 도착해서 주문 중이에요.", at: minAgo(70) },
    { from: "other", text: "오케이! 저는 노트북 스티커 많은 사람입니다.", at: minAgo(66) },
    { from: "me", text: "찾았어요. 2층 가운데 테이블 맞죠?", at: minAgo(62) },
    { from: "other", text: "맞아요! 옆자리로 앉으시면 돼요.", at: minAgo(61), isRead: false },
  ],

  // 401: 레드버튼 보드게임(승인형)
  "401": [
    { from: "system", text: "호스트가 참여 요청을 확인 중이에요.", at: dayAgo(4), type: "SYSTEM" },
    { from: "me", text: "보드게임 모임 신청했습니다!", at: dayAgo(4) },
    { from: "other", text: "승인 완료 🎲 초보도 괜찮아요. 선호 장르 있나요?", at: dayAgo(4) },
    { from: "me", text: "협력/파티게임 좋아해요. 룰 설명 가능하면 더 좋고요.", at: dayAgo(3.95) },
    { from: "other", text: "완벽! 스컬/더마인드/스플렌더 중에서 고를게요.", at: dayAgo(3.9) },
    { from: "me", text: "좋아요. 비용은 현장에서 1/N인가요?", at: dayAgo(3.85) },
    { from: "other", text: "네. 입장료+음료 정도예요. 늦으면 톡 주세요.", at: dayAgo(3.8) },
    { from: "me", text: "오늘 15:55쯤 도착할 것 같아요.", at: hourAgo(26) },
    { from: "other", text: "확인! 1층 계산대 앞에서 만나요.", at: hourAgo(25.8), isRead: false },
  ],

  // 402: 레드버튼 2호점(즉시)
  "402": [
    { from: "system", text: "모임 채팅이 열렸어요.", at: dayAgo(2), type: "SYSTEM" },
    { from: "me", text: "2호점 보드게임 모임 참여해도 될까요?", at: dayAgo(2) },
    { from: "other", text: "가능해요! 지하2층 내려오시면 바로 보여요.", at: dayAgo(2) },
    { from: "me", text: "인원 지금 몇 명이에요?", at: dayAgo(2) },
    { from: "other", text: "현재 3명, 3자리 남았어요.", at: dayAgo(2) },
    { from: "me", text: "저는 18:25쯤 도착합니다.", at: hourAgo(8.3) },
    { from: "other", text: "테이블 번호는 들어와서 안내받으면 돼요. 제가 먼저 체크인 할게요.", at: hourAgo(8.2) },
    { from: "other", text: "혹시 좋아하는 게임 스타일 있어요?", at: minAgo(15), isRead: false },
  ],

  // H901: 스타벅스 번개 모각코(마감임박 느낌)
  "H901": [
    { from: "system", text: "마감 임박 모임이에요. 빠르게 합류해보세요!", at: minAgo(80), type: "SYSTEM" },
    { from: "other", text: "지금 2층 자리 잡았어요. 오실 수 있나요?", at: minAgo(78) },
    { from: "me", text: "네! 15분 내 도착 가능합니다.", at: minAgo(76) },
    { from: "other", text: "좋아요. 2층 가운데 긴 테이블(입구 기준 오른쪽)!", at: minAgo(74) },
    { from: "me", text: "주문 중이에요. 아이스 아메리카노 들고 올라갈게요.", at: minAgo(60) },
    { from: "other", text: "오케이! 자리 1개 비워둘게요.", at: minAgo(58) },
    { from: "other", text: "도착하시면 노트북 펼쳐둔 사람(검정 후드) 찾으면 돼요.", at: minAgo(22), isRead: false },
  ],

  // H902: 레드버튼 라이트 보드게임(마감임박 느낌)
  "H902": [
    { from: "system", text: "마감 임박 모임이에요.", at: minAgo(140), type: "SYSTEM" },
    { from: "me", text: "방금 보고 연락드려요! 지금도 참여 가능할까요?", at: minAgo(138) },
    { from: "other", text: "가능해요! 한 자리 남았어요.", at: minAgo(136) },
    { from: "me", text: "어느 게임 하고 계신가요?", at: minAgo(134) },
    { from: "other", text: "더마인드/스컬 중 고민 중이에요. 오시면 같이 결정해요.", at: minAgo(132) },
    { from: "me", text: "좋아요. 30분 내 도착해요.", at: minAgo(126) },
    { from: "other", text: "1층 계산대 앞에서 '모임'이라고 말하면 안내해줘요.", at: minAgo(124) },
    { from: "other", text: "지금 테이블 확정됐어요. 7번 테이블!", at: minAgo(18), isRead: false },
  ],

  // H903: 교보 문구/굿즈(마감임박 느낌)
  "H903": [
    { from: "system", text: "마감 임박 모임이에요.", at: minAgo(200), type: "SYSTEM" },
    { from: "me", text: "문구 구경 모임 참여해도 될까요?", at: minAgo(198) },
    { from: "other", text: "네! 지금 B1 문구 코너 입구에 있어요.", at: minAgo(196) },
    { from: "me", text: "저 10분만에 도착할게요.", at: minAgo(190) },
    { from: "other", text: "오케이. 오시면 파란색 쇼핑백 들고 있는 사람 찾으세요.", at: minAgo(188) },
    { from: "other", text: "혹시 찾는 품목 있으면 미리 말해도 좋아요.", at: minAgo(30), isRead: false },
  ],

  // 501: 서초문화예술회관
  "501": [
    { from: "system", text: "공연/전시 모임은 시간 엄수 부탁드려요.", at: dayAgo(6), type: "SYSTEM" },
    { from: "me", text: "안녕하세요! 공연 모임 참여합니다. 로비 집결 맞죠?", at: dayAgo(6) },
    { from: "other", text: "네 로비요. 20분 전에 만나서 같이 입장할게요.", at: dayAgo(6) },
    { from: "me", text: "드레스코드 같은 건 없겠죠?", at: dayAgo(5.9) },
    { from: "other", text: "전혀요. 편하게 오시면 됩니다.", at: dayAgo(5.9) },
    { from: "me", text: "티켓은 각자 예매 완료했어요!", at: dayAgo(5.8) },
    { from: "other", text: "좋아요. 입구 오른쪽 카페 앞에서 만나면 찾기 쉬워요.", at: dayAgo(5.75) },
    { from: "other", text: "혹시 늦으면 바로 메시지 주세요.", at: hourAgo(12.6), isRead: false },
  ],

  // 502: 영화(종료된 모임) - 짧은 후기/감사
  "502": [
    { from: "system", text: "모임이 종료되었어요. 후기를 남겨주세요.", at: dayAgo(4), type: "SYSTEM" },
    { from: "other", text: "오늘 영화 재밌었어요! 같이 봐서 더 좋았네요.", at: dayAgo(4) },
    { from: "me", text: "맞아요 ㅋㅋ IMAX 사운드 좋았어요.", at: dayAgo(4) },
    { from: "other", text: "끝나고 커피도 딱 좋았고요. 다음에 또 봐요!", at: dayAgo(4) },
    { from: "me", text: "네! 다음에도 모임 열리면 참여할게요.", at: dayAgo(3.95) },
  ],
};

const mkMsgs = (threadId: string, meetingId: string): DMMessage[] => {
  const steps = SCENARIOS[String(meetingId)] ?? [
    { from: "system", text: "모임 채팅이 열렸어요.", at: hourAgo(1), type: "SYSTEM" },
    { from: "other", text: "안녕하세요! 참여 가능할까요?", at: hourAgo(0.9) },
    { from: "me", text: "네 가능합니다!", at: hourAgo(0.8) },
  ];
  return mkThreadMsgs(threadId, meetingId, steps);
};

const DM_MESSAGES_SEED: Record<string, DMMessage[]> = {
  t101: mkMsgs("t101", "101"),
  t201: mkMsgs("t201", "201"),
  t202: mkMsgs("t202", "202"),
  t203: mkMsgs("t203", "203"),
  t301: mkMsgs("t301", "301"),
  t302: mkMsgs("t302", "302"),
  t303: mkMsgs("t303", "303"),
  t401: mkMsgs("t401", "401"),
  t402: mkMsgs("t402", "402"),
  tH901: mkMsgs("tH901", "H901"),
  tH902: mkMsgs("tH902", "H902"),
  tH903: mkMsgs("tH903", "H903"),
  t501: mkMsgs("t501", "501"),
  t502: mkMsgs("t502", "502"),
};

const buildThread = (threadId: string, meetingId: string, title: string): DMThread => {
  const msgs = DM_MESSAGES_SEED[threadId] ?? [];
  const last = ensureLastMessage(threadId, msgs);

  const unreadCount = (Array.isArray(msgs) ? msgs : []).reduce((acc, m) => {
    const sender = String((m as any)?.senderId ?? MY_ID);
    const isRead = !!(m as any)?.isRead;
    const isSystem = String((m as any)?.type ?? "") === "SYSTEM" || sender === SYS_ID;
    if (isSystem) return acc;
    return sender !== MY_ID && !isRead ? acc + 1 : acc;
  }, 0);

  const otherUser = pickOther(meetingId);

  return {
    id: String(threadId),
    otherUser: {
      id: String(otherUser?.id ?? "unknown"),
      nickname: String(otherUser?.nickname ?? "알 수 없음"),
      avatarUrl: (otherUser?.avatarUrl ?? null) as any,
    } as any,
    lastMessage: cloneMessage(last) as any,
    unreadCount: typeof unreadCount === "number" ? unreadCount : 0,
    updatedAt: (((last as any)?.createdAt ?? nowIso()) as unknown) as ISODateTimeString,
    relatedMeetingId: String(meetingId),
    relatedMeetingTitle: String(title ?? "모임"),
  } as any;
};

const DM_THREADS_SEED: DMThread[] = [
  buildThread("tH903", "H903", "교보문고 문구 구경(번개)"),
  buildThread("tH902", "H902", "레드버튼 라이트 보드게임(번개)"),
  buildThread("tH901", "H901", "스타벅스 번개 모각코(60분)"),
  buildThread("t202", "202", "치맥 번개"),
  buildThread("t101", "101", "배드민턴 더블 2게임"),
  buildThread("t203", "203", "짬뽕/짜장 점심"),
  buildThread("t303", "303", "강남R 집중 작업 90분"),
  buildThread("t301", "301", "역삼도서관 모각코 2시간"),
  buildThread("t302", "302", "교보문고 책/스터디 1시간"),
  buildThread("t401", "401", "레드버튼 보드게임 한 판"),
  buildThread("t402", "402", "레드버튼 2호점 보드게임"),
  buildThread("t201", "201", "점심 생태탕"),
  buildThread("t501", "501", "공연/전시 같이 보기"),
  buildThread("t502", "502", "영화 관람(종료)"),
].sort((a, b) => toMs((b as any)?.updatedAt) - toMs((a as any)?.updatedAt));

// -----------------------------------------------------------------------------
// Local(Mock) Service (In-memory Fake Server)
// -----------------------------------------------------------------------------
let _MESSAGES: Record<string, DMMessage[]> = Object.fromEntries(
  Object.entries(DM_MESSAGES_SEED ?? {}).map(([k, v]) => [
    k,
    (Array.isArray(v) ? v : []).map((m) =>
      cloneMessage({
        ...(m as any),
        threadId: String((m as any)?.threadId ?? k),
      } as DMMessage)
    ),
  ])
);

let _THREADS: DMThread[] = (Array.isArray(DM_THREADS_SEED) ? DM_THREADS_SEED : []).map((t) => {
  const threadId = String((t as any)?.id ?? "unknown");
  const msgs = _MESSAGES[threadId] ?? [];
  const last = ensureLastMessage(threadId, msgs);

  const unreadCount = (Array.isArray(msgs) ? msgs : []).reduce((acc, m) => {
    const sender = String((m as any)?.senderId ?? MY_ID);
    const isRead = !!(m as any)?.isRead;
    const isSystem = String((m as any)?.type ?? "") === "SYSTEM" || sender === SYS_ID;
    if (isSystem) return acc;
    return sender !== MY_ID && !isRead ? acc + 1 : acc;
  }, 0);

  return {
    ...(t as any),
    id: threadId,
    otherUser: {
      id: String((t as any)?.otherUser?.id ?? "unknown"),
      nickname: String((t as any)?.otherUser?.nickname ?? "알 수 없음"),
      avatarUrl: (t as any)?.otherUser?.avatarUrl ?? null,
    },
    lastMessage: { ...(last as any) },
    unreadCount: typeof unreadCount === "number" ? unreadCount : 0,
    updatedAt: (((t as any)?.updatedAt ?? (last as any)?.createdAt ?? nowIso()) as unknown) as ISODateTimeString,
    createdAt: (t as any)?.createdAt,
    relatedMeetingId: (t as any)?.relatedMeetingId,
    relatedMeetingTitle: (t as any)?.relatedMeetingTitle,
    relatedMeeting: (t as any)?.relatedMeeting,
  } as DMThread;
});

const findThreadLocal = (threadId: string) => (_THREADS ?? []).find((t) => String((t as any)?.id) === String(threadId));

function recomputeThreadSummaryLocal(threadId: string) {
  const th = findThreadLocal(threadId);
  if (!th) return;

  const msgs = _MESSAGES[threadId] ?? [];
  const unread = (Array.isArray(msgs) ? msgs : []).filter((m) => {
    const sender = String((m as any)?.senderId ?? MY_ID);
    const isRead = !!(m as any)?.isRead;
    const isSystem = String((m as any)?.type ?? "") === "SYSTEM" || sender === SYS_ID;
    if (isSystem) return false;
    return sender !== MY_ID && !isRead;
  }).length;

  (th as any).unreadCount = typeof unread === "number" ? unread : 0;

  const last = ensureLastMessage(threadId, msgs);
  (th as any).lastMessage = last as any;
  (th as any).updatedAt = (last as any)?.createdAt ?? nowIso();
}

export const dmLocalService: DmService = {
  async getThreads(): Promise<DMThread[]> {
    await delay();
    return [...(_THREADS ?? [])]
      .sort((a, b) => toMs((b as any)?.updatedAt) - toMs((a as any)?.updatedAt))
      .map(cloneThread);
  },

  async getThread(threadId: string): Promise<DMThread> {
    await delay(120);
    const id = String(threadId ?? "").trim();
    if (!id) throw new Error("Thread ID is missing");

    const th = findThreadLocal(id);
    if (!th) throw new Error("Thread not found");
    return cloneThread(th);
  },

  async findThreadByMeetingId(meetingId: string): Promise<DMThread | null> {
    await delay();
    const mid = String(meetingId ?? "").trim();
    if (!mid) return null;

    const th = (_THREADS ?? []).find((t) => String((t as any)?.relatedMeetingId ?? "") === mid);
    return th ? cloneThread(th) : null;
  },

  async getMessages(threadId: string): Promise<DMMessage[]> {
    await delay();
    const id = String(threadId ?? "").trim();
    if (!id) return [];

    const msgs = Array.isArray(_MESSAGES[id]) ? [..._MESSAGES[id]] : [];
    return msgs
      .map((m) => cloneMessage({ ...(m as any), threadId: id } as DMMessage))
      .sort((a, b) => toMs((a as any)?.createdAt) - toMs((b as any)?.createdAt));
  },

  async sendMessage(threadId: string, text: string): Promise<DMMessage> {
    await delay();
    const id = String(threadId ?? "").trim();
    if (!id) throw new Error("Thread ID is required");

    const trimmed = String(text ?? "").trim();
    if (!trimmed) throw new Error("메시지를 입력해주세요.");

    const newMessage: DMMessage = {
      id: `m_${Date.now()}`,
      threadId: id,
      type: "TEXT" as any,
      text: trimmed,
      senderId: MY_ID as any,
      createdAt: nowIso(),
      isRead: true,
    } as DMMessage;

    _MESSAGES[id] = Array.isArray(_MESSAGES[id]) ? [..._MESSAGES[id], newMessage] : [newMessage];

    const th = findThreadLocal(id);
    if (th) {
      (th as any).lastMessage = newMessage as any;
      (th as any).updatedAt = (newMessage as any)?.createdAt ?? nowIso();
      recomputeThreadSummaryLocal(id);
    } else {
      _THREADS.unshift({
        id,
        otherUser: { id: "unknown", nickname: "알 수 없음", avatarUrl: null } as any,
        lastMessage: newMessage as any,
        unreadCount: 0,
        updatedAt: (newMessage as any)?.createdAt ?? nowIso(),
        relatedMeetingId: undefined,
        relatedMeetingTitle: undefined,
      } as any);
    }

    return cloneMessage(newMessage);
  },

  async markRead(threadId: string): Promise<void> {
    await delay(80);
    const id = String(threadId ?? "").trim();
    if (!id) return;

    const msgs = Array.isArray(_MESSAGES[id]) ? _MESSAGES[id] : [];
    _MESSAGES[id] = msgs.map((m) => {
      const sender = String((m as any)?.senderId ?? MY_ID);
      const isSystem = String((m as any)?.type ?? "") === "SYSTEM" || sender === SYS_ID;
      if (isSystem) return m;
      return sender !== MY_ID ? ({ ...(m as any), isRead: true } as any) : m;
    }) as any;

    recomputeThreadSummaryLocal(id);
  },
};

// 3줄 요약
// - 일회성 모임 느낌이 나도록 meetingId별 thread를 14개로 늘리고, 각 thread에 짧은 대화 로그를 여러 개 추가했습니다.
// - "마감 임박" 번개 모임(H901~H903)도 DM 시드에 포함해 최신/미확인 메시지가 리스트에 자연스럽게 보이게 했습니다.
// - SYSTEM 메시지는 unread 카운트에서 제외되도록 방어 처리하고, thread summary는 lastMessage/updatedAt 기준으로 재계산합니다.