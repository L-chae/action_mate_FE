// src/features/dm/api/dmApi.ts
import type { ISODateTimeString } from "@/shared/model/types";
import type { ApiMessage, MessageRoomResponse } from "@/shared/api/schemas";
import { client } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/api/endpoints";
import { getCurrentUserId } from "@/shared/api/authToken";
import { ensureArray } from "@/shared/model/mappers";
import { mapApiMessagesToDMMessages, mapDMTextToPlainBody, mapMessageRoomsToDMThreads } from "../model/mappers";
import type { DMMessage, DMThread } from "../model/types";
import { nowIso as nowIsoShared } from "@/shared/utils/timeText";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
type DmService = {
  getThreads(): Promise<DMThread[]>;
  getThread(threadId: string): Promise<DMThread>;
  findThreadByMeetingId(meetingId: string): Promise<DMThread | null>;
  getMessages(threadId: string): Promise<DMMessage[]>;
  sendMessage(threadId: string, text: string): Promise<DMMessage>;
  markRead(threadId: string): Promise<void>;
};

type ApiMode = "mock" | "remote";

// -----------------------------------------------------------------------------
// Env / Mode
// -----------------------------------------------------------------------------
function parseEnvBool(v: unknown): boolean | undefined {
  if (v == null) return undefined;
  const s = String(v).trim().toLowerCase();
  if (!s) return undefined;
  if (s === "true" || s === "1" || s === "yes" || s === "y" || s === "on") return true;
  if (s === "false" || s === "0" || s === "no" || s === "n" || s === "off") return false;
  return undefined;
}

function resolveDmMode(): ApiMode {
  const dmFlag = parseEnvBool(process.env.EXPO_PUBLIC_USE_DM_MOCK);
  const globalFlag = parseEnvBool(process.env.EXPO_PUBLIC_USE_MOCK);

  if (!__DEV__) return "remote";

  const useMock = dmFlag ?? globalFlag ?? false;
  return useMock ? "mock" : "remote";
}

export const __DM_API_MODE__: ApiMode = resolveDmMode();
export const USE_DM_MOCK: boolean = __DM_API_MODE__ === "mock";

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log(`[DM Service] Mode: ${USE_DM_MOCK ? "MOCK (Fake Data)" : "REMOTE (Real Server)"}`);
}

// -----------------------------------------------------------------------------
// Shared helpers
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
// MOCK DATA (2~3개만 유지)
// -----------------------------------------------------------------------------
const MY_ID = "me";
const baseNow = Date.now();
const minAgo = (m: number) => new Date(baseNow - m * 60_000).toISOString() as ISODateTimeString;
const hourAgo = (h: number) => new Date(baseNow - h * 3600_000).toISOString() as ISODateTimeString;

type DMUserLite = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
};

const OTHER_USERS: DMUserLite[] = [
  { id: "user_701", nickname: "윤아", avatarUrl: "https://picsum.photos/seed/user_701/128/128" },
  { id: "user_702", nickname: "도윤", avatarUrl: "https://picsum.photos/seed/user_702/128/128" },
  { id: "user_703", nickname: "지훈", avatarUrl: "https://picsum.photos/seed/user_703/128/128" },
];

const pickOther = (seed: string): DMUserLite => {
  const s = String(seed ?? "");
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return OTHER_USERS[h % OTHER_USERS.length] ?? OTHER_USERS[0];
};

const mkMsgs = (threadId: string, meetingId: string): DMMessage[] => {
  const other = pickOther(meetingId)?.id ?? "unknown";

  if (meetingId === "101") {
    return [
      { id: `${threadId}-1`, threadId, type: "TEXT", text: "배드민턴 참여 가능할까요? 라켓은 챙겨갈게요.", senderId: MY_ID as any, createdAt: minAgo(45), isRead: true },
      { id: `${threadId}-2`, threadId, type: "TEXT", text: "가능해요! 11번 출구 10분 전 집결해요. 실내화만 부탁!", senderId: other as any, createdAt: minAgo(40), isRead: true },
      { id: `${threadId}-3`, threadId, type: "TEXT", text: "확인했습니다. 신청 넣어둘게요!", senderId: MY_ID as any, createdAt: minAgo(12), isRead: true },
    ] as unknown as DMMessage[];
  }

  if (meetingId === "203") {
    return [
      { id: `${threadId}-1`, threadId, type: "TEXT", text: "참여 확인됐어요. 선릉역 5번 출구 19:10에 봬요!", senderId: other as any, createdAt: hourAgo(5.9), isRead: true },
      { id: `${threadId}-2`, threadId, type: "TEXT", text: "네 출발합니다. 자리 잡으셨나요?", senderId: MY_ID as any, createdAt: hourAgo(1.1), isRead: true },
      { id: `${threadId}-3`, threadId, type: "TEXT", text: "4인석 잡았어요. 들어오시면 이름만 말해주시면 돼요!", senderId: other as any, createdAt: minAgo(22), isRead: false },
    ] as unknown as DMMessage[];
  }

  // default: meetingId === "304" (or others)
  return [
    { id: `${threadId}-1`, threadId, type: "TEXT", text: "지금 도착했는데 위치가 어디쯤일까요?", senderId: MY_ID as any, createdAt: hourAgo(2.2), isRead: true },
    { id: `${threadId}-2`, threadId, type: "TEXT", text: "2층 라운지요. 조용히 들어와서 자리 잡으시면 됩니다.", senderId: other as any, createdAt: hourAgo(2.1), isRead: true },
    { id: `${threadId}-3`, threadId, type: "TEXT", text: "‘모각코’ 예약이라고 말하고 3번 자리로 와주세요!", senderId: other as any, createdAt: minAgo(6), isRead: false },
  ] as unknown as DMMessage[];
};

const DM_MESSAGES_SEED: Record<string, DMMessage[]> = {
  t101: mkMsgs("t101", "101"),
  t203: mkMsgs("t203", "203"),
  t304: mkMsgs("t304", "304"),
};

const buildThread = (threadId: string, meetingId: string, title: string): DMThread => {
  const msgs = DM_MESSAGES_SEED[threadId] ?? [];
  const last = msgs[msgs.length - 1];

  const unreadCount = msgs.reduce((acc, m) => (((m as any)?.senderId ?? MY_ID) !== MY_ID && !(m as any)?.isRead ? acc + 1 : acc), 0);
  const otherUser = pickOther(meetingId);

  return {
    id: String(threadId),
    otherUser: {
      id: String(otherUser?.id ?? "unknown"),
      nickname: String(otherUser?.nickname ?? "알 수 없음"),
      avatarUrl: (otherUser?.avatarUrl ?? null) as any,
    } as any,
    lastMessage: (last ? cloneMessage(last) : ensureLastMessage(threadId, msgs)) as any,
    unreadCount: typeof unreadCount === "number" ? unreadCount : 0,
    updatedAt: (((last as any)?.createdAt ?? nowIso()) as unknown) as ISODateTimeString,
    relatedMeetingId: String(meetingId),
    relatedMeetingTitle: String(title ?? "모임"),
  } as any;
};

const DM_THREADS_SEED: DMThread[] = [
  buildThread("t304", "304", "모각코 (스터디)"),
  buildThread("t101", "101", "배드민턴 번개"),
  buildThread("t203", "203", "저녁 번개 (선릉)"),
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

  return {
    ...(t as any),
    id: threadId,
    otherUser: {
      id: String((t as any)?.otherUser?.id ?? "unknown"),
      nickname: String((t as any)?.otherUser?.nickname ?? "알 수 없음"),
      avatarUrl: (t as any)?.otherUser?.avatarUrl ?? null,
    },
    lastMessage: { ...(last as any) },
    unreadCount: typeof (t as any)?.unreadCount === "number" ? (t as any).unreadCount : 0,
    updatedAt: (((t as any)?.updatedAt ?? (last as any)?.createdAt ?? nowIso()) as unknown) as ISODateTimeString,
    createdAt: (t as any)?.createdAt,
    relatedMeetingId: (t as any)?.relatedMeetingId,
    relatedMeetingTitle: (t as any)?.relatedMeetingTitle,
    relatedMeeting: (t as any)?.relatedMeeting,
  } as DMThread;
});

const findThreadLocal = (threadId: string) => _THREADS.find((t) => String((t as any)?.id) === String(threadId));

function recomputeThreadSummaryLocal(threadId: string) {
  const th = findThreadLocal(threadId);
  if (!th) return;

  const msgs = _MESSAGES[threadId] ?? [];
  const unread = msgs.filter((m) => String((m as any)?.senderId ?? MY_ID) !== MY_ID && !(m as any)?.isRead).length;
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
    _MESSAGES[id] = msgs.map((m) =>
      String((m as any)?.senderId ?? MY_ID) !== MY_ID ? ({ ...(m as any), isRead: true } as any) : m
    ) as any;

    recomputeThreadSummaryLocal(id);
  },
};

// -----------------------------------------------------------------------------
// Remote Service
// -----------------------------------------------------------------------------
function extractHttpStatus(e: unknown): number | undefined {
  return (e as any)?.response?.status;
}

export const dmRemoteService: DmService = {
  async getThreads(): Promise<DMThread[]> {
    const fetchedAt = nowIso();

    const { data } = await client.get<MessageRoomResponse | MessageRoomResponse[]>(endpoints.message.rooms);
    const rooms = ensureArray(data);

    return mapMessageRoomsToDMThreads(rooms, fetchedAt);
  },

  async getThread(threadId: string): Promise<DMThread> {
    const id = String(threadId ?? "").trim();
    if (!id) throw new Error("Thread ID is missing");

    const threads = await dmRemoteService.getThreads();
    const found = threads.find((t) => String((t as any)?.id) === id);
    if (!found) throw new Error("Thread not found");
    return found;
  },

  async findThreadByMeetingId(meetingId: string): Promise<DMThread | null> {
    const mid = String(meetingId ?? "").trim();
    if (!mid) return null;

    const threads = await dmRemoteService.getThreads();
    const found = threads.find((t) => String((t as any)?.relatedMeetingId ?? "") === mid);
    return found ?? null;
  },

  async getMessages(threadId: string): Promise<DMMessage[]> {
    const id = String(threadId ?? "").trim();
    if (!id) return [];

    const myLoginId = await getCurrentUserId();
    const { data } = await client.get<ApiMessage | ApiMessage[]>(endpoints.message.room(id));

    const list = mapApiMessagesToDMMessages(data, myLoginId ?? undefined);
    return [...(Array.isArray(list) ? list : [])].sort((a, b) => toMs((a as any)?.createdAt) - toMs((b as any)?.createdAt));
  },

  async sendMessage(threadId: string, text: string): Promise<DMMessage> {
    const id = String(threadId ?? "").trim();
    if (!id) throw new Error("Thread ID is required");

    const myLoginId = await getCurrentUserId();
    const trimmed = String(text ?? "").trim();
    if (!trimmed) throw new Error("메시지를 입력해주세요.");

    const bodyPlain = mapDMTextToPlainBody(trimmed);

    try {
      const { data } = await client.post<ApiMessage>(endpoints.message.room(id), bodyPlain, {
        headers: { "Content-Type": "text/plain" },
      });

      const [mapped] = mapApiMessagesToDMMessages([data], myLoginId ?? undefined);
      if (!mapped) throw new Error("메시지 전송 결과를 처리할 수 없습니다.");
      return mapped;
    } catch (e) {
      const st = extractHttpStatus(e);
      if (st === 415 || st === 400) {
        const { data } = await client.post<ApiMessage>(
          endpoints.message.room(id),
          { content: trimmed },
          { headers: { "Content-Type": "application/json" } }
        );

        const [mapped] = mapApiMessagesToDMMessages([data], myLoginId ?? undefined);
        if (!mapped) throw new Error("메시지 전송 결과를 처리할 수 없습니다.");
        return mapped;
      }
      throw e;
    }
  },

  async markRead(_threadId: string): Promise<void> {
    return;
  },
};

// -----------------------------------------------------------------------------
// Selected service + Public API (기존 dmApi.ts와 동일한 형태 유지)
// -----------------------------------------------------------------------------
export const dmService: DmService = USE_DM_MOCK ? dmLocalService : dmRemoteService;

export async function listDMThreads(): Promise<DMThread[]> {
  return dmService.getThreads();
}

export async function getDMThread(threadId: string): Promise<DMThread> {
  return dmService.getThread(threadId);
}

export async function findDMThreadByMeetingId(meetingId: string): Promise<DMThread | null> {
  return dmService.findThreadByMeetingId(meetingId);
}

export async function getDMMessages(threadId: string): Promise<DMMessage[]> {
  return dmService.getMessages(threadId);
}

export async function sendDMMessage(threadId: string, text: string): Promise<DMMessage> {
  return dmService.sendMessage(threadId, text);
}

export async function markDMThreadRead(threadId: string): Promise<void> {
  return dmService.markRead(threadId);
}

export default dmService;

// 3줄 요약
// - dmApi.local/remote/index/mockData 4개를 dmApi.ts 한 파일로 통합했고, mock 데이터는 3개 스레드만 남겼습니다.
// - USE_DM_MOCK(환경변수)로 mock/remote 선택을 한 곳에서만 관리하며, 외부 공개 함수 시그니처는 유지했습니다.
// - null/빈값 방어(문자열 정규화, 배열/필드 기본값)로 런타임 크래시를 줄였습니다.