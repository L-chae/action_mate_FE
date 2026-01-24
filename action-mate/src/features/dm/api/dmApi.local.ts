// src/features/dm/api/dmApi.local.ts
import type { DMMessage, DMThread } from "../model/types";
// 🚨 [주의] 이 파일(dmMockData.ts)이 실제로 존재해야 합니다. 없으면 에러 납니다.
import { DM_MESSAGES_SEED, DM_THREADS_SEED } from "./dmMockData";

/**
 * Local DM Service (Fake Server)
 */

// --- Helpers ---
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

// 날짜 파싱 유틸 (중복 제거 대신 파일 내 로컬 사용 유지하되 안전하게 처리)
const toMs = (iso?: string) => {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
};

function ensureLastMessage(threadId: string, msgs: DMMessage[] | undefined): DMMessage {
  const list = msgs ?? [];
  // 최신순 정렬 후 첫 번째
  const last = [...list].sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt))[0];

  if (last) {
    return {
      ...last,
      threadId,
      type: last.type ?? "TEXT",
      createdAt: last.createdAt || new Date().toISOString(),
      isRead: typeof last.isRead === "boolean" ? last.isRead : true,
    };
  }

  return {
    id: `sys_${Date.now()}`,
    threadId,
    type: "SYSTEM",
    text: "대화를 시작해보세요.",
    senderId: "me",
    createdAt: new Date().toISOString(),
    isRead: true,
  };
}

// 1) 메모리 DB 초기화
let _MESSAGES: Record<string, DMMessage[]> = Object.fromEntries(
  Object.entries(DM_MESSAGES_SEED).map(([k, v]) => [k, v.map((m) => ({ ...m, threadId: m.threadId ?? k }))])
);

let _THREADS: DMThread[] = DM_THREADS_SEED.map((t) => {
  const last = ensureLastMessage(t.id, _MESSAGES[t.id]);
  return {
    ...t,
    otherUser: { ...t.otherUser, avatarUrl: t.otherUser.avatarUrl ?? null },
    lastMessage: { ...last },
    unreadCount: typeof t.unreadCount === "number" ? t.unreadCount : 0,
    updatedAt: t.updatedAt ?? last.createdAt,
  };
});

const findThread = (threadId: string) => _THREADS.find((t) => t.id === threadId);

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
    otherUser: { ...t.otherUser },
    lastMessage: { ...t.lastMessage },
  };
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
    const th = _THREADS.find((t) => String(t.relatedMeetingId ?? "") === String(meetingId));
    return th ? cloneThread(th) : null;
  },

  async getMessages(threadId: string): Promise<DMMessage[]> {
    await delay();
    const msgs = _MESSAGES[threadId] ? [..._MESSAGES[threadId]] : [];
    return msgs.sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt));
  },

  async sendMessage(threadId: string, text: string): Promise<DMMessage> {
    await delay();
    const trimmed = text.trim();
    if (!trimmed) throw new Error("메시지를 입력해주세요.");

    const newMessage: DMMessage = {
      id: `m_${Date.now()}`,
      threadId,
      type: "TEXT",
      text: trimmed,
      senderId: "me",
      createdAt: new Date().toISOString(),
      isRead: true,
    };

    _MESSAGES[threadId] = _MESSAGES[threadId] ? [..._MESSAGES[threadId], newMessage] : [newMessage];

    const th = findThread(threadId);
    if (th) {
      th.lastMessage = newMessage;
      th.updatedAt = newMessage.createdAt;
    } else {
      // 스레드가 없으면 생성 (Mocking 동작)
      _THREADS.unshift({
        id: threadId,
        otherUser: { id: "unknown", nickname: "알 수 없음", avatarUrl: null },
        lastMessage: newMessage,
        unreadCount: 0,
        updatedAt: newMessage.createdAt,
      });
    }

    return { ...newMessage };
  },

  async markRead(threadId: string): Promise<void> {
    await delay(80);
    const msgs = _MESSAGES[threadId] ?? [];
    _MESSAGES[threadId] = msgs.map((m) => (m.senderId !== "me" ? { ...m, isRead: true } : m));
    recomputeThreadSummary(threadId);
  },
};