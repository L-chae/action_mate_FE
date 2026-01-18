import type { DMMessage, DMThread } from "../model/types";
import { DM_MESSAGES_SEED, DM_THREADS_SEED } from "./dmMockData";

/**
 * ✅ Local API Service (Fake Server Logic)
 */

// 1. 메모리 DB 초기화 (원본 보호)
let _THREADS: DMThread[] = DM_THREADS_SEED.map((t) => ({
  ...t,
  otherUser: { ...t.otherUser },
  lastMessage: t.lastMessage ? { ...t.lastMessage } : (undefined as any),
}));

let _MESSAGES: Record<string, DMMessage[]> = Object.fromEntries(
  Object.entries(DM_MESSAGES_SEED).map(([k, v]) => [k, v.map((m) => ({ ...m }))])
);

// --- Helpers ---
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));
const toTimeMs = (iso?: string) => (iso ? new Date(iso).getTime() : 0);
const findThread = (threadId: string) => _THREADS.find((t) => t.id === threadId);

// 읽음 처리 및 요약 업데이트
function recomputeThreadUnread(threadId: string) {
  const th = findThread(threadId);
  if (!th) return;

  const msgs = _MESSAGES[threadId] ?? [];
  const unread = msgs.filter((m) => m.senderId !== "me" && !m.isRead).length;
  th.unreadCount = unread;

  const last = [...msgs].sort((a, b) => toTimeMs(b.createdAt) - toTimeMs(a.createdAt))[0];
  if (last) {
    th.lastMessage = last;
    th.updatedAt = last.createdAt;
  }
}

// --- Implementation ---
export const dmLocalService = {
  // 채팅 목록
  async getThreads(): Promise<DMThread[]> {
    await delay();
    return [..._THREADS].sort((a, b) => toTimeMs(b.updatedAt) - toTimeMs(a.updatedAt));
  },

  // 채팅방 상세 정보
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
  
  // 메시지 목록
  async getMessages(threadId: string): Promise<DMMessage[]> {
    await delay();
    const msgs = _MESSAGES[threadId] ? [..._MESSAGES[threadId]] : [];
    // 오래된 순 정렬
    return msgs.sort((a, b) => toTimeMs(a.createdAt) - toTimeMs(b.createdAt));
  },

  // 메시지 전송
  async sendMessage(threadId: string, text: string): Promise<DMMessage> {
    await delay();
    const newMessage: DMMessage = {
      id: Date.now().toString(),
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
      // 신규 스레드 생성 예외처리
      _THREADS.unshift({
        id: threadId,
        otherUser: { id: "unknown", nickname: "알 수 없음" },
        lastMessage: newMessage,
        unreadCount: 0,
        updatedAt: newMessage.createdAt,
      } as DMThread);
    }
    return newMessage;
  },

  // 읽음 처리
  async markRead(threadId: string): Promise<void> {
    await delay(100);
    const msgs = _MESSAGES[threadId] ?? [];
    _MESSAGES[threadId] = msgs.map((m) =>
      m.senderId !== "me" ? { ...m, isRead: true } : m
    );
    recomputeThreadUnread(threadId);
  },
};