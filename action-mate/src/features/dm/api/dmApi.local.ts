// src/features/dm/api/dmApi.local.ts
import type { ISODateTimeString } from "@/shared/model/types";
import type { DMMessage, DMThread } from "../model/types";
// ✅ local 파일은 mock 모드에서만 lazy-import 되므로, 여기서 seed를 정적으로 가져와도 remote에는 영향이 없습니다.
import { DM_MESSAGES_SEED, DM_THREADS_SEED } from "./dmMockData";

/**
 * Local DM Service (Fake Server)
 */

// --- Helpers ---
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

const toMs = (iso?: string) => {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
};

const nowIso = (): ISODateTimeString => new Date().toISOString() as ISODateTimeString;

function ensureLastMessage(threadId: string, msgs: DMMessage[] | undefined): DMMessage {
  const list = msgs ?? [];
  const last = [...list].sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt))[0];

  if (last) {
    return {
      ...last,
      threadId,
      type: last.type ?? "TEXT",
      createdAt: (last.createdAt ? last.createdAt : nowIso()) as ISODateTimeString,
      isRead: typeof last.isRead === "boolean" ? last.isRead : true,
      text: typeof last.text === "string" ? last.text : "",
      senderId: (last.senderId ?? "me") as any,
    } as DMMessage;
  }

  return {
    id: `sys_${Date.now()}`,
    threadId,
    type: "SYSTEM",
    text: "대화를 시작해보세요.",
    senderId: "me",
    createdAt: nowIso(),
    isRead: true,
  } as DMMessage;
}

// 1) 메모리 DB 초기화
let _MESSAGES: Record<string, DMMessage[]> = Object.fromEntries(
  Object.entries(DM_MESSAGES_SEED ?? {}).map(([k, v]) => [
    k,
    (v ?? []).map((m) => ({
      ...(m as any),
      threadId: (m as any)?.threadId ?? k,
      type: (m as any)?.type ?? "TEXT",
      text: typeof (m as any)?.text === "string" ? (m as any).text : "",
      createdAt: ((m as any)?.createdAt ? (m as any).createdAt : nowIso()) as ISODateTimeString,
      isRead: typeof (m as any)?.isRead === "boolean" ? (m as any).isRead : true,
      senderId: ((m as any)?.senderId ?? "me") as any,
    })) as DMMessage[],
  ])
);

let _THREADS: DMThread[] = (DM_THREADS_SEED ?? []).map((t) => {
  const last = ensureLastMessage(String((t as any)?.id ?? "unknown"), _MESSAGES[String((t as any)?.id ?? "")]);
  return {
    ...(t as any),
    id: String((t as any)?.id ?? "unknown"),
    otherUser: {
      id: String((t as any)?.otherUser?.id ?? "unknown"),
      nickname: String((t as any)?.otherUser?.nickname ?? "알 수 없음"),
      avatarUrl: (t as any)?.otherUser?.avatarUrl ?? null,
    },
    lastMessage: { ...last },
    unreadCount: typeof (t as any)?.unreadCount === "number" ? (t as any).unreadCount : 0,
    updatedAt: ((t as any)?.updatedAt ?? last.createdAt ?? nowIso()) as ISODateTimeString,
    createdAt: (t as any)?.createdAt,
    relatedMeetingId: (t as any)?.relatedMeetingId,
    relatedMeetingTitle: (t as any)?.relatedMeetingTitle,
    relatedMeeting: (t as any)?.relatedMeeting,
  } as DMThread;
});

const findThread = (threadId: string) => _THREADS.find((t) => String(t.id) === String(threadId));

function recomputeThreadSummary(threadId: string) {
  const th = findThread(threadId);
  if (!th) return;

  const msgs = _MESSAGES[threadId] ?? [];
  const unread = msgs.filter((m) => m.senderId !== "me" && !m.isRead).length;
  th.unreadCount = unread;

  const last = ensureLastMessage(threadId, msgs);
  th.lastMessage = last;
  th.updatedAt = last.createdAt;
}

function cloneThread(t: DMThread): DMThread {
  return {
    ...t,
    otherUser: { ...(t.otherUser as any) },
    lastMessage: { ...(t.lastMessage as any) },
    relatedMeeting: t.relatedMeeting ? { ...(t.relatedMeeting as any) } : undefined,
  } as DMThread;
}

// --- Implementation ---
export const dmLocalService = {
  async getThreads(): Promise<DMThread[]> {
    await delay();
    return [..._THREADS]
      .sort((a, b) => toMs(b.updatedAt) - toMs(a.updatedAt))
      .map(cloneThread);
  },

  async getThread(threadId: string): Promise<DMThread> {
    await delay(120);
    const th = findThread(threadId);
    if (!th) throw new Error("Thread not found");
    return cloneThread(th);
  },

  async findThreadByMeetingId(meetingId: string): Promise<DMThread | null> {
    await delay();
    const th = _THREADS.find((t) => String((t as any)?.relatedMeetingId ?? "") === String(meetingId));
    return th ? cloneThread(th) : null;
  },

  async getMessages(threadId: string): Promise<DMMessage[]> {
    await delay();
    const msgs = _MESSAGES[threadId] ? [..._MESSAGES[threadId]] : [];
    return msgs
      .map((m) => ({
        ...(m as any),
        threadId,
        type: m.type ?? "TEXT",
        text: typeof m.text === "string" ? m.text : "",
        createdAt: (m.createdAt ? m.createdAt : nowIso()) as ISODateTimeString,
        isRead: typeof m.isRead === "boolean" ? m.isRead : true,
        senderId: (m.senderId ?? "me") as any,
      }))
      .sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt));
  },

  async sendMessage(threadId: string, text: string): Promise<DMMessage> {
    await delay();
    const trimmed = String(text ?? "").trim();
    if (!trimmed) throw new Error("메시지를 입력해주세요.");

    const newMessage: DMMessage = {
      id: `m_${Date.now()}`,
      threadId,
      type: "TEXT",
      text: trimmed,
      senderId: "me",
      createdAt: nowIso(),
      isRead: true,
    } as DMMessage;

    _MESSAGES[threadId] = _MESSAGES[threadId] ? [..._MESSAGES[threadId], newMessage] : [newMessage];

    const th = findThread(threadId);
    if (th) {
      th.lastMessage = newMessage;
      th.updatedAt = newMessage.createdAt;
      recomputeThreadSummary(threadId);
    } else {
      _THREADS.unshift({
        id: threadId,
        otherUser: { id: "unknown", nickname: "알 수 없음", avatarUrl: null } as any,
        lastMessage: newMessage,
        unreadCount: 0,
        updatedAt: newMessage.createdAt,
      } as any);
    }

    return { ...(newMessage as any) } as DMMessage;
  },

  async markRead(threadId: string): Promise<void> {
    await delay(80);
    const msgs = _MESSAGES[threadId] ?? [];
    _MESSAGES[threadId] = msgs.map((m) => (m.senderId !== "me" ? { ...(m as any), isRead: true } : m)) as any;
    recomputeThreadSummary(threadId);
  },
};

export default dmLocalService;