import type { DMMessage, DMThread } from "./types";
import { DM_MESSAGES_SEED, DM_THREADS_SEED } from "./dmMockData";

/**
 * ✅ DM 도메인 단일 서비스
 * - list threads / get thread / get messages / send / mark as read
 * - meeting과는 relatedMeetingId로 "연결"만 (도메인 분리 유지)
 */

// ✅ 서비스 내부 원본(쓰기 주체)
let _THREADS: DMThread[] = DM_THREADS_SEED.map((t) => ({
  ...t,
  otherUser: { ...t.otherUser },
  lastMessage: t.lastMessage ? { ...t.lastMessage } : (undefined as any),
}));

let _MESSAGES: Record<string, DMMessage[]> = Object.fromEntries(
  Object.entries(DM_MESSAGES_SEED).map(([k, v]) => [k, v.map((m) => ({ ...m }))])
);

// --- Helper ---
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

function toTimeMs(iso?: string) {
  if (!iso) return 0;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function sortByCreatedAtAsc(a: DMMessage, b: DMMessage) {
  return toTimeMs(a.createdAt) - toTimeMs(b.createdAt);
}

function sortThreadsByUpdatedAtDesc(a: DMThread, b: DMThread) {
  return toTimeMs(b.updatedAt) - toTimeMs(a.updatedAt);
}

function findThread(threadId: string) {
  return _THREADS.find((t) => t.id === threadId);
}

function cloneThread(th: DMThread): DMThread {
  return {
    ...th,
    otherUser: { ...th.otherUser },
    lastMessage: th.lastMessage ? { ...th.lastMessage } : (undefined as any),
  };
}

function cloneMessages(msgs: DMMessage[]) {
  return msgs.map((m) => ({ ...m }));
}

function recomputeThreadUnread(threadId: string) {
  const th = findThread(threadId);
  if (!th) return;

  const msgs = _MESSAGES[threadId] ?? [];
  const unread = msgs.filter((m) => m.senderId !== "me" && !m.isRead).length;
  th.unreadCount = unread;

  // lastMessage는 "가장 최근 메시지"로 유지
  const last = [...msgs].sort((a, b) => toTimeMs(b.createdAt) - toTimeMs(a.createdAt))[0];
  if (last) {
    th.lastMessage = last;
    th.updatedAt = last.createdAt;
  }
}

/**
 * ✅ 0) 스레드 단건 조회 (DMThreadScreen에서 사용)
 */
export async function getDMThread(threadId: string): Promise<DMThread> {
  await delay(150);
  const th = findThread(threadId);
  if (!th) throw new Error("Thread not found");
  return cloneThread(th);
}

/**
 * ✅ 1) 채팅방 목록 조회 (최신 업데이트 순)
 */
export async function listDMThreads(): Promise<DMThread[]> {
  await delay();
  return [..._THREADS].sort(sortThreadsByUpdatedAtDesc).map(cloneThread);
}

/**
 * ✅ 2) 특정 채팅방 메시지 조회 (오래된 -> 최신)
 */
export async function getDMMessages(threadId: string): Promise<DMMessage[]> {
  await delay();
  const msgs = _MESSAGES[threadId] ? [..._MESSAGES[threadId]] : [];
  return msgs.sort(sortByCreatedAtAsc).map((m) => ({ ...m }));
}

/**
 * ✅ 3) 메시지 전송
 * - thread가 없다면(예: 신규 스레드) 안전하게 생성도 가능하게 처리
 */
export async function sendDMMessage(threadId: string, text: string): Promise<DMMessage> {
  await delay();

  const newMessage: DMMessage = {
    id: Date.now().toString(),
    text,
    senderId: "me",
    createdAt: new Date().toISOString(),
    isRead: true, // 내가 보낸건 읽음 처리
  };

  // 메시지 저장
  if (_MESSAGES[threadId]) _MESSAGES[threadId].push(newMessage);
  else _MESSAGES[threadId] = [newMessage];

  // thread 갱신 (없으면 만들어도 되지만, 최소한 크래시 방지)
  const th = findThread(threadId);
  if (th) {
    th.lastMessage = newMessage;
    th.updatedAt = newMessage.createdAt;
  } else {
    // ✅ 신규 스레드 생성(최소 정보)
    _THREADS.unshift({
      id: threadId,
      otherUser: { id: "unknown", nickname: "대화상대" },
      lastMessage: newMessage,
      unreadCount: 0,
      updatedAt: newMessage.createdAt,
    } as DMThread);
  }

  return { ...newMessage };
}

/**
 * ✅ 4) 해당 스레드에서 상대 메시지 "읽음 처리"
 * - DM 리스트의 unreadCount도 동기화
 */
export async function markDMThreadRead(threadId: string): Promise<void> {
  await delay(150);

  const msgs = _MESSAGES[threadId] ?? [];
  _MESSAGES[threadId] = msgs.map((m) => (m.senderId !== "me" ? { ...m, isRead: true } : m));

  recomputeThreadUnread(threadId);
}

/**
 * ✅ (옵션) meetingId로 스레드 찾기 (상세에서 "채팅하기" 연결 시 유용)
 */
export async function findDMThreadByMeetingId(meetingId: string): Promise<DMThread | null> {
  await delay(150);
  const th = _THREADS.find((t) => t.relatedMeetingId === meetingId);
  return th ? cloneThread(th) : null;
}

/**
 * (옵션) 디버그/테스트용
 */
export function __getDmMockUnsafe() {
  return { threads: _THREADS, messages: _MESSAGES };
}
