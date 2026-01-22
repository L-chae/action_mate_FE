import type { DMMessage, DMThread } from "../model/types";
import { DM_MESSAGES_SEED, DM_THREADS_SEED } from "./dmMockData";

/**
 * ✅ Local API Service (Fake Server Logic)
 */

// --- Helpers ---
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));
const toTimeMs = (iso?: string) => (iso ? new Date(iso).getTime() : 0);

function ensureLastMessage(threadId: string, msgs: DMMessage[] | undefined): DMMessage {
  const list = msgs ?? [];
  const last = [...list].sort((a, b) => toTimeMs(b.createdAt) - toTimeMs(a.createdAt))[0];
  if (last) return last;

  // seed가 비었어도 스레드가 깨지지 않게 최소 시스템 메시지 생성
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

// 1. 메모리 DB 초기화 (원본 보호)
let _MESSAGES: Record<string, DMMessage[]> = Object.fromEntries(
  Object.entries(DM_MESSAGES_SEED).map(([k, v]) => [k, v.map((m) => ({ ...m }))])
);

let _THREADS: DMThread[] = DM_THREADS_SEED.map((t) => {
  const last = ensureLastMessage(t.id, _MESSAGES[t.id]);
  return {
    ...t,
    otherUser: { ...t.otherUser },
    lastMessage: { ...last },
    unreadCount: t.unreadCount ?? 0,
    updatedAt: t.updatedAt ?? last.createdAt,
  };
});

const findThread = (threadId: string) => _THREADS.find((t) => t.id === threadId);

// 읽음 처리 및 요약 업데이트
function recomputeThreadUnread(threadId: string) {
  const th = findThread(threadId);
  if (!th) return;

  const msgs = _MESSAGES[threadId] ?? [];
  const unread = msgs.filter((m) => m.senderId !== "me" && !m.isRead).length;
  th.unreadCount = unread;

  const last = ensureLastMessage(threadId, msgs);
  th.lastMessage = last;
  th.updatedAt = last.createdAt;
}

// --- Implementation ---
export const dmLocalService = {
  async getThreads(): Promise<DMThread[]> {
    await delay();
    return [..._THREADS].sort((a, b) => toTimeMs(b.updatedAt) - toTimeMs(a.updatedAt));
  },

  async getThread(threadId: string): Promise<DMThread> {
    await delay(150);
    const th = findThread(threadId);
    if (!th) throw new Error("Thread not found");
    return { ...th };
  },

  async findThreadByMeetingId(meetingId: string): Promise<DMThread | null> {
    await delay();
    const th = _THREADS.find((t) => t.relatedMeetingId === meetingId);
    return th ? { ...th } : null;
  },

  async getMessages(threadId: string): Promise<DMMessage[]> {
    await delay();
    const msgs = _MESSAGES[threadId] ? [..._MESSAGES[threadId]] : [];
    return msgs.sort((a, b) => toTimeMs(a.createdAt) - toTimeMs(b.createdAt));
  },

  async sendMessage(threadId: string, text: string): Promise<DMMessage> {
    await delay();
    const newMessage: DMMessage = {
      id: Date.now().toString(),
      threadId,
      type: "TEXT",
      text,
      senderId: "me",
      createdAt: new Date().toISOString(),
      isRead: true,
    };

    if (_MESSAGES[threadId]) _MESSAGES[threadId].push(newMessage);
    else _MESSAGES[threadId] = [newMessage];

    const th = findThread(threadId);
    if (th) {
      th.lastMessage = newMessage;
      th.updatedAt = newMessage.createdAt;
    } else {
      _THREADS.unshift({
        id: threadId,
        otherUser: { id: "unknown", nickname: "알 수 없음", avatarUrl: null },
        lastMessage: newMessage,
        unreadCount: 0,
        updatedAt: newMessage.createdAt,
      });
    }

    return newMessage;
  },

  async markRead(threadId: string): Promise<void> {
    await delay(100);
    const msgs = _MESSAGES[threadId] ?? [];
    _MESSAGES[threadId] = msgs.map((m) => (m.senderId !== "me" ? { ...m, isRead: true } : m));
    recomputeThreadUnread(threadId);
  },
};