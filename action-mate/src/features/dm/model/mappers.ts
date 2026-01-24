// src/features/dm/model/mappers.ts
import type { ApiMessage, MessageRoomResponse } from "@/shared/api/schemas";
import type { ISODateTimeString, UserSummary } from "@/shared/model/types";
import { normalizeId } from "@/shared/model/types";
import { ensureArray } from "@/shared/model/mappers";
import type { DMMessage, DMMessageRaw, DMThread, DMThreadRaw } from "./types";

/**
 * ✅ DM Raw -> UI mapper
 * - 서버가 createdAt/isRead를 주지 않는 케이스를 흡수
 * - UI 모델을 "항상 안전한 값"으로 만들어 컴포넌트/스토어에서 분기 제거
 */

const nowIso = (): ISODateTimeString => new Date().toISOString();

const safeText = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);

const safeBool = (v: unknown, fallback: boolean): boolean => (typeof v === "boolean" ? v : fallback);

const safeIso = (v: unknown, fallback: ISODateTimeString): ISODateTimeString =>
  typeof v === "string" && v.trim() ? (v as ISODateTimeString) : fallback;

const safeUserSummary = (raw?: any): UserSummary => ({
  id: normalizeId(raw?.id ?? "unknown"),
  nickname: typeof raw?.nickname === "string" && raw.nickname.trim() ? raw.nickname : "알 수 없음",
  avatarUrl: raw?.avatarUrl ?? null,
});

export const mapDMMessageRawToUI = (raw: DMMessageRaw, threadIdFallback?: string, myId?: string): DMMessage => {
  const threadId = normalizeId(raw.threadId ?? threadIdFallback ?? "unknown");
  const senderNormalized = raw.senderId === "me" ? "me" : normalizeId(raw.senderId ?? "unknown");

  // myId가 있으면 senderId를 "me"로 치환(기존 로직 유지)
  const senderId: "me" | string = myId && senderNormalized !== "me" && senderNormalized === normalizeId(myId) ? "me" : senderNormalized;

  const createdAt = safeIso(raw.createdAt, nowIso());

  return {
    id: normalizeId(raw.id ?? `${threadId}:${Date.now()}`),
    threadId,
    type: raw.type ?? "TEXT",
    text: safeText(raw.text, ""),
    senderId: senderId as any,
    createdAt,
    isRead: safeBool(raw.isRead, true),
  };
};

export const mapDMThreadRawToUI = (raw: DMThreadRaw): DMThread => {
  const id = normalizeId(raw.id ?? "unknown");
  const last = raw.lastMessage ?? ({ id: `${id}:last`, text: "", senderId: "me" } as DMMessageRaw);

  const lastMessage = mapDMMessageRawToUI(last, id);

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
 * ✅ OpenAPI 기반 MessageRoomResponse -> DMThread(UI)
 * - 서버 목록에 createdAt/updatedAt이 없으므로 lastMessage 기준으로 채움
 */
export const mapMessageRoomToDMThread = (room: MessageRoomResponse): DMThread => {
  const threadId = normalizeId(room.roomId);
  const otherUserId = normalizeId(room.opponentId);

  const lastMessage: DMMessage = {
    id: `${threadId}:last`,
    threadId,
    type: "TEXT",
    text: safeText(room.lastMessageContent, ""),
    senderId: otherUserId,
    createdAt: nowIso(), // 서버 스펙에 없음 → 최소 기본값
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
    updatedAt: lastMessage.createdAt,
    createdAt: undefined,
    relatedMeetingId: room.postId != null ? normalizeId(room.postId) : undefined,
    relatedMeetingTitle: undefined,
    relatedMeeting: room.postId != null ? { id: normalizeId(room.postId), title: "" } : undefined,
  };
};

export const mapMessageRoomsToDMThreads = (
  value: MessageRoomResponse | MessageRoomResponse[] | null | undefined,
): DMThread[] => ensureArray(value).map(mapMessageRoomToDMThread);

/**
 * ✅ OpenAPI ApiMessage -> DMMessage(UI)
 * - 서버에 createdAt/isRead가 없으므로 기본값 정책 적용
 */
export const mapApiMessageToDMMessage = (msg: ApiMessage, myLoginId?: string): DMMessage => {
  const threadId = normalizeId(msg.roomId);
  const sender = normalizeId(msg.senderId);
  const senderId = myLoginId && sender === normalizeId(myLoginId) ? "me" : sender;

  return {
    id: normalizeId(msg.messageId),
    threadId,
    type: "TEXT",
    text: safeText(msg.content, ""),
    senderId: senderId as any,
    createdAt: nowIso(), // 서버 스펙에 없음
    isRead: true, // 서버 스펙에 없음
  };
};

export const mapApiMessagesToDMMessages = (
  value: ApiMessage | ApiMessage[] | null | undefined,
  myLoginId?: string,
): DMMessage[] => ensureArray(value).map((m) => mapApiMessageToDMMessage(m, myLoginId));

export const mapDMTextToPlainBody = (text: string): string => text;