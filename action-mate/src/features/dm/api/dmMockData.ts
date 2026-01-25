// src/features/dm/api/dmMockData.ts
import type { DMMessage, DMThread } from "../model/types";
import { MOCK_MEETINGS_SEED } from "@/features/meetings/mocks/meetingMockData";

/**
 * DM 목업 데이터 (축약 버전)
 * - 모임 seed와 동기화
 * - 내가 호스트인 모임이면 otherUser가 '참가자 풀'에서 선택되도록 처리
 * - Threads는 Messages로부터 자동 생성(드리프트 방지)
 */

const now = Date.now();
const minAgo = (m: number) => new Date(now - m * 60_000).toISOString();
const hourAgo = (h: number) => new Date(now - h * 3600_000).toISOString();
const dayAgo = (d: number) => new Date(now - d * 24 * 3600_000).toISOString();

const MY_ID = "me";

type DMUserLite = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
};

// ✅ seed 조회 O(1)
const MEETING_MAP = new Map<string, (typeof MOCK_MEETINGS_SEED)[number]>(
  MOCK_MEETINGS_SEED.map((m) => [String(m.id), m])
);

const getMeetingById = (id: string) => MEETING_MAP.get(String(id));
const getMeetingTitle = (id: string) => getMeetingById(id)?.title ?? "삭제된 모임";

const getMeetingHost = (id: string): DMUserLite => {
  const host = (getMeetingById(id)?.host ?? null) as any;
  return host
    ? {
        id: String(host.id ?? "unknown"),
        nickname: String(host.nickname ?? "알 수 없음"),
        avatarUrl: host.avatarUrl ?? null,
      }
    : { id: "unknown", nickname: "알 수 없음", avatarUrl: null };
};

// ✅ 내가 호스트인 모임(otherUser가 me가 되는 문제) 방지용 참가자 풀
const ATTENDEE_POOL: DMUserLite[] = [
  { id: "user_701", nickname: "윤아", avatarUrl: "https://picsum.photos/seed/user_701/128/128" },
  { id: "user_702", nickname: "도윤", avatarUrl: "https://picsum.photos/seed/user_702/128/128" },
  { id: "user_703", nickname: "지훈", avatarUrl: "https://picsum.photos/seed/user_703/128/128" },
];

const hashKey = (s: string) => {
  // 왜: 동일 meetingId -> 동일 상대가 선택되어 UI 테스트가 재현 가능
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

const pickAttendee = (meetingId: string) => ATTENDEE_POOL[hashKey(meetingId) % ATTENDEE_POOL.length];

const getThreadOtherUser = (meetingId: string): DMUserLite => {
  const host = getMeetingHost(meetingId);
  return host.id && host.id !== MY_ID ? host : pickAttendee(meetingId);
};

const otherId = (meetingId: string) => getThreadOtherUser(meetingId).id;

// ✅ 메시지 템플릿(축약): 2~4개만으로도 "대화 있어 보이게"
const mkMsgs = (threadId: string, meetingId: string) => {
  const o = otherId(meetingId);

  // 상태/맥락은 "도착/위치/준비물/취소/후기" 키워드로만 최소 표현
  switch (meetingId) {
    case "101": // OPEN 스포츠
      return [
        { id: `${threadId}-1`, threadId, type: "TEXT", text: "배드민턴 참여 가능할까요? 라켓은 챙겨갈게요.", senderId: MY_ID, createdAt: minAgo(45), isRead: true },
        { id: `${threadId}-2`, threadId, type: "TEXT", text: "가능해요! 11번 출구 10분 전 집결해요. 실내화만 부탁!", senderId: o, createdAt: minAgo(40), isRead: true },
        { id: `${threadId}-3`, threadId, type: "TEXT", text: "확인했습니다. 신청 넣어둘게요!", senderId: MY_ID, createdAt: minAgo(12), isRead: true },
      ] as DMMessage[];

    case "203": // FULL + MEMBER 식사/번개
      return [
        { id: `${threadId}-1`, threadId, type: "TEXT", text: "참여 확인됐어요. 선릉역 5번 출구 19:10에 봬요!", senderId: o, createdAt: hourAgo(5.9), isRead: true },
        { id: `${threadId}-2`, threadId, type: "TEXT", text: "네 출발합니다. 자리 잡으셨나요?", senderId: MY_ID, createdAt: hourAgo(1.1), isRead: true },
        { id: `${threadId}-3`, threadId, type: "TEXT", text: "4인석 잡았어요. 들어오시면 이름만 말해주시면 돼요!", senderId: o, createdAt: minAgo(22), isRead: false },
      ] as DMMessage[];

    case "304": // STARTED + MEMBER 스터디/작업
      return [
        { id: `${threadId}-1`, threadId, type: "TEXT", text: "지금 도착했는데 위치가 어디쯤일까요?", senderId: MY_ID, createdAt: hourAgo(2.2), isRead: true },
        { id: `${threadId}-2`, threadId, type: "TEXT", text: "2층 라운지요. 조용히 들어와서 자리 잡으시면 됩니다.", senderId: o, createdAt: hourAgo(2.1), isRead: true },
        { id: `${threadId}-3`, threadId, type: "TEXT", text: "‘모각코’ 예약이라고 말하고 3번 자리로 와주세요!", senderId: o, createdAt: minAgo(6), isRead: false },
      ] as DMMessage[];

    case "301": // APPROVAL + PENDING
      return [
        { id: `${threadId}-1`, threadId, type: "TEXT", text: "모각코 신청드렸습니다. 프론트 UI 작업 예정이에요.", senderId: MY_ID, createdAt: hourAgo(9.2), isRead: true },
        { id: `${threadId}-2`, threadId, type: "TEXT", text: "확인했습니다. 노트북/이어폰 가능하시면 승인 진행할게요.", senderId: o, createdAt: hourAgo(2.1), isRead: false },
      ] as DMMessage[];

    case "205": // CANCELED
      return [
        { id: `${threadId}-1`, threadId, type: "TEXT", text: "내일 모임이 호스트 일정으로 취소되었어요. 죄송합니다.", senderId: o, createdAt: dayAgo(1.5), isRead: true },
        { id: `${threadId}-2`, threadId, type: "TEXT", text: "미리 알려주셔서 감사합니다!", senderId: MY_ID, createdAt: dayAgo(1.49), isRead: true },
      ] as DMMessage[];

    case "531": // ENDED + MEMBER 후기
      return [
        { id: `${threadId}-1`, threadId, type: "TEXT", text: "오늘 재밌었어요! 다음에도 일정 올리면 또 갈게요.", senderId: MY_ID, createdAt: dayAgo(3.8), isRead: true },
        { id: `${threadId}-2`, threadId, type: "TEXT", text: "와주셔서 감사해요. 다음엔 딕싯도 가져올게요!", senderId: o, createdAt: dayAgo(3.7), isRead: true },
      ] as DMMessage[];

    case "106": // ENDED + MEMBER 스포츠
      return [
        { id: `${threadId}-1`, threadId, type: "TEXT", text: "집결 몇 분 전에 가면 좋을까요?", senderId: MY_ID, createdAt: dayAgo(6.0), isRead: true },
        { id: `${threadId}-2`, threadId, type: "TEXT", text: "7:50쯤 오시면 브리핑 후 출발해요. 헬멧/라이트 확인 부탁!", senderId: o, createdAt: dayAgo(6.0), isRead: true },
        { id: `${threadId}-3`, threadId, type: "TEXT", text: "오늘 고생하셨어요. 다음에도 시간 맞으면 또 봬요!", senderId: o, createdAt: dayAgo(5.8), isRead: true },
      ] as DMMessage[];

    case "501": // OPEN 동탄
      return [
        { id: `${threadId}-1`, threadId, type: "TEXT", text: "러닝 페이스 어느 정도인가요? 걷뛰도 가능한가요?", senderId: MY_ID, createdAt: hourAgo(12.0), isRead: true },
        { id: `${threadId}-2`, threadId, type: "TEXT", text: "걷뛰 가능해요. 집결 핀은 확정되면 보내드릴게요.", senderId: o, createdAt: hourAgo(11.8), isRead: false },
      ] as DMMessage[];

    case "103": // FULL + MEMBER
      return [
        { id: `${threadId}-1`, threadId, type: "TEXT", text: "탁구 라켓 대여 가능할까요?", senderId: MY_ID, createdAt: hourAgo(8.2), isRead: true },
        { id: `${threadId}-2`, threadId, type: "TEXT", text: "네 1개 여유 있어요. 도착하면 카운터에 이름만 말해주세요!", senderId: o, createdAt: minAgo(45), isRead: false },
      ] as DMMessage[];

    case "401": // OPEN 게임
      return [
        { id: `${threadId}-1`, threadId, type: "TEXT", text: "초보인데 참여 가능할까요? 어떤 게임 위주인가요?", senderId: MY_ID, createdAt: hourAgo(7.2), isRead: true },
        { id: `${threadId}-2`, threadId, type: "TEXT", text: "완전 환영! 파티게임+가벼운 전략 섞어서 진행해요. 룰 설명해드릴게요.", senderId: o, createdAt: hourAgo(7.0), isRead: true },
      ] as DMMessage[];

    case "405": // ENDED + HOST(me)
      return [
        { id: `${threadId}-1`, threadId, type: "TEXT", text: "정모 감사했어요! 다음에도 열리면 또 갈게요.", senderId: o, createdAt: dayAgo(1.1), isRead: true },
        { id: `${threadId}-2`, threadId, type: "TEXT", text: "와주셔서 감사해요. 다음엔 라인업 더 준비해볼게요.", senderId: MY_ID, createdAt: dayAgo(1.08), isRead: true },
      ] as DMMessage[];

    default:
      // seed에 존재하지만 위에서 커버 안 된 케이스 대비
      return [
        { id: `${threadId}-1`, threadId, type: "TEXT", text: "안녕하세요! 모임 관련 문의드립니다.", senderId: MY_ID, createdAt: hourAgo(2), isRead: true },
        { id: `${threadId}-2`, threadId, type: "TEXT", text: "네 확인했습니다. 필요한 정보 있으면 편하게 말씀 주세요!", senderId: o, createdAt: hourAgo(1.9), isRead: false },
      ] as DMMessage[];
  }
};

// Messages (축약)
export const DM_MESSAGES_SEED: Record<string, DMMessage[]> = {
  t304: mkMsgs("t304", "304"),
  t101: mkMsgs("t101", "101"),
  t203: mkMsgs("t203", "203"),
  t103: mkMsgs("t103", "103"),
  t301: mkMsgs("t301", "301"),
  t401: mkMsgs("t401", "401"),
  t405: mkMsgs("t405", "405"),
  t205: mkMsgs("t205", "205"),
  t501: mkMsgs("t501", "501"),
  t531: mkMsgs("t531", "531"),
  t106: mkMsgs("t106", "106"),
};

// ✅ Threads 생성
const buildThread = (threadId: string, meetingId: string): DMThread => {
  const msgs = DM_MESSAGES_SEED[threadId] ?? [];
  const last = msgs[msgs.length - 1];

  // 왜: "상대가 보낸 안읽음"만 배지로 보이게(내가 보낸 미확인 메시지는 일반적으로 배지 집계에서 제외)
  const unreadCount = msgs.reduce((acc, m) => (m.senderId !== MY_ID && !m.isRead ? acc + 1 : acc), 0);

  return {
    id: threadId,
    otherUser: getThreadOtherUser(meetingId),
    lastMessage: last,
    unreadCount,
    updatedAt: last?.createdAt ?? new Date().toISOString(),
    relatedMeetingId: meetingId,
    relatedMeetingTitle: getMeetingTitle(meetingId),
  };
};

export const DM_THREADS_SEED: DMThread[] = [
  buildThread("t304", "304"),
  buildThread("t101", "101"),
  buildThread("t203", "203"),
  buildThread("t103", "103"),
  buildThread("t301", "301"),
  buildThread("t401", "401"),
  buildThread("t405", "405"),
  buildThread("t205", "205"),
  buildThread("t501", "501"),
  buildThread("t531", "531"),
  buildThread("t106", "106"),
].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
