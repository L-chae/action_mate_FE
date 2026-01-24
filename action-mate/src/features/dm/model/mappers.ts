// src/features/dm/model/mappers.ts
import type { ApiMessage, MessageRoomResponse } from "@/shared/api/schemas";
import type { ISODateTimeString, UserSummary } from "@/shared/model/types";
import { normalizeId } from "@/shared/model/types";
import { ensureArray } from "@/shared/model/mappers";
import type { DMMessage, DMMessageRaw, DMThread, DMThreadRaw } from "./types";
import { nowIso } from "@/shared/utils/timeText";
/**
 * DM Mapper
 * - Raw/Server DTO -> UI 모델로 "한 번만" 정리
 * - UI에서는 분기 최소화(필수 값 보장)
 */

const safeText = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);

const safeBool = (v: unknown, fallback: boolean): boolean => (typeof v === "boolean" ? v : fallback);

const safeIso = (v: unknown, fallback: ISODateTimeString): ISODateTimeString => {
  if (typeof v !== "string") return fallback;
  const s = v.trim();
  if (!s) return fallback;
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? (s as ISODateTimeString) : fallback;
};

const safeUserSummary = (raw?: any): UserSummary => ({
  id: normalizeId(raw?.id ?? "unknown"),
  nickname: typeof raw?.nickname === "string" && raw.nickname.trim() ? raw.nickname : "알 수 없음",
  avatarUrl: raw?.avatarUrl ?? null,
});

export const mapDMMessageRawToUI = (raw: DMMessageRaw, threadIdFallback?: string, myId?: string): DMMessage => {
  const threadId = normalizeId(raw.threadId ?? threadIdFallback ?? "unknown");

  const rawSender = raw.senderId === "me" ? "me" : normalizeId(raw.senderId ?? "unknown");
  const myNorm = myId ? normalizeId(myId) : undefined;

  // 왜 치환하나?
  // - 서버는 senderId를 "내 id"로 주고, UI는 "me"로 비교하는 기존 로직을 유지하기 위함
  const senderId: "me" | string = myNorm && rawSender !== "me" && rawSender === myNorm ? "me" : rawSender;

  return {
    id: normalizeId(raw.id ?? `${threadId}:${Date.now()}`),
    threadId,
    type: raw.type ?? "TEXT",
    text: safeText(raw.text, ""),
    senderId: senderId === "me" ? "me" : normalizeId(senderId),
    createdAt: safeIso(raw.createdAt, nowIso()),
    isRead: safeBool(raw.isRead, true),
  };
};

export const mapDMThreadRawToUI = (raw: DMThreadRaw): DMThread => {
  const id = normalizeId(raw.id ?? "unknown");

  const lastRaw: DMMessageRaw =
    raw.lastMessage ??
    ({
      id: `${id}:last`,
      threadId: id,
      type: "SYSTEM",
      text: "대화를 시작해보세요.",
      senderId: "me",
      createdAt: raw.updatedAt ?? raw.createdAt ?? nowIso(),
      isRead: true,
    } as DMMessageRaw);

  const lastMessage = mapDMMessageRawToUI(lastRaw, id);

  return {
    id,
    otherUser: safeUserSummary(raw.otherUser),
    lastMessage,
    unreadCount: typeof raw.unreadCount === "number" ? raw.unreadCount : 0,
    updatedAt: safeIso(raw.updatedAt, lastMessage.createdAt),
    createdAt: raw.createdAt,
    relatedMeetingId: raw.relatedMeetingId != null ? normalizeId(raw.relatedMeetingId) : undefined,
    relatedMeetingTitle: raw.relatedMeetingTitle,
    relatedMeeting: raw.relatedMeeting
      ? { id: normalizeId(raw.relatedMeeting.id), title: raw.relatedMeeting.title }
      : undefined,
  };
};

/**
 * OpenAPI MessageRoomResponse -> DMThread(UI)
 * - 서버 응답에 updatedAt/createdAt이 없어서 "요청 시각"을 동일하게 주입해서 화면 안정성을 확보
 * - (각 스레드에 nowIso()를 개별로 찍으면 정렬/표시가 흔들릴 수 있음)
 */
export const mapMessageRoomToDMThread = (room: MessageRoomResponse, fetchedAt: ISODateTimeString): DMThread => {
  const threadId = normalizeId(room.roomId);
  const otherUserId = normalizeId(room.opponentId);

  const lastMessage: DMMessage = {
    id: `${threadId}:last`,
    threadId,
    type: "TEXT",
    text: safeText(room.lastMessageContent, ""),
    // lastMessage sender 정보가 서버에 없으므로 opponent로 둠(정확히 하려면 서버 스펙 필요)
    senderId: otherUserId,
    createdAt: fetchedAt,
    isRead: (room.unReadCount ?? 0) === 0,
  };

  return {
    id: threadId,
    otherUser: {
      id: otherUserId,
      nickname: room.opponentNickname ?? "알 수 없음",
      avatarUrl: room.opponentProfileImageUrl ?? null,
    },
    lastMessage,
    unreadCount: room.unReadCount ?? 0,
    updatedAt: fetchedAt,
    createdAt: undefined,
    relatedMeetingId: room.postId != null ? normalizeId(room.postId) : undefined,
    relatedMeetingTitle: undefined,
    relatedMeeting: room.postId != null ? { id: normalizeId(room.postId), title: "" } : undefined,
  };
};

export const mapMessageRoomsToDMThreads = (
  value: MessageRoomResponse | MessageRoomResponse[] | null | undefined,
  fetchedAt: ISODateTimeString,
): DMThread[] => ensureArray(value).map((room) => mapMessageRoomToDMThread(room, fetchedAt));

/**
 * OpenAPI ApiMessage -> DMMessage(UI)
 * - 서버에 createdAt/isRead가 없으므로 "호출 시 fallback"을 주입해서 리스트 정렬/렌더 안정화
 */
export const mapApiMessageToDMMessage = (
  msg: ApiMessage,
  myLoginId?: string,
  createdAtFallback?: ISODateTimeString,
): DMMessage => {
  const threadId = normalizeId(msg.roomId);
  const sender = normalizeId(msg.senderId);
  const senderId: "me" | string = myLoginId && sender === normalizeId(myLoginId) ? "me" : sender;

  return {
    id: normalizeId(msg.messageId),
    threadId,
    type: "TEXT",
    text: safeText(msg.content, ""),
    senderId: senderId === "me" ? "me" : normalizeId(senderId),
    createdAt: createdAtFallback ?? nowIso(),
    isRead: true,
  };
};

export const mapApiMessagesToDMMessages = (
  value: ApiMessage | ApiMessage[] | null | undefined,
  myLoginId?: string,
): DMMessage[] => {
  const arr = ensureArray(value);

  // 왜 여기서 fallback createdAt을 주나?
  // - 서버가 createdAt을 안 주면, 메시지 정렬이 매번 흔들릴 수 있음
  // - 배열 순서를 유지하도록 "호출 시점 기준으로 초 단위 증가" 시간을 부여
  const baseMs = Date.now() - Math.max(arr.length - 1, 0) * 1000;

  return arr.map((m, idx) => {
    const createdAt = new Date(baseMs + idx * 1000).toISOString() as ISODateTimeString;
    return mapApiMessageToDMMessage(m, myLoginId, createdAt);
  });
};

export const mapDMTextToPlainBody = (text: string): string => text;