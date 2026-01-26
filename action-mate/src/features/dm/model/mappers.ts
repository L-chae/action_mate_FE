// src/features/dm/model/mappers.ts
import type { Message, MessageRoomResponse } from "@/shared/api/schemas";
import type { ISODateTimeString, UserSummary } from "@/shared/model/types";
import { normalizeId } from "@/shared/model/types";
import { endpoints } from "@/shared/api/endpoints";
import type { DMMessage, DMMessageRaw, DMThread, DMThreadRaw } from "./types";
import { nowIso } from "@/shared/utils/timeText";

/**
 * DM Mapper (OpenAPI v1.2.4 정합)
 * - /message/room  -> MessageRoomResponse[]
 * - /message/room/{roomId} -> Message[]
 */

const img = (name?: string): string | null => (name ? endpoints.images.get(name) : null);

const toUserSummaryFromRoom = (room: MessageRoomResponse): UserSummary => ({
  id: normalizeId(room.opponentId),
  nickname: room.opponentNickname?.trim() ? room.opponentNickname : "알 수 없음",
  avatarUrl: img(room.opponentProfileImageName),
});

export const mapDMMessageRawToUI = (
  raw: DMMessageRaw,
  myLoginId?: string,
  createdAtFallback: ISODateTimeString = nowIso(),
): DMMessage => {
  const threadId = normalizeId(raw.roomId);
  const senderNorm = normalizeId(raw.senderId);
  const myNorm = myLoginId ? normalizeId(myLoginId) : null;
  const senderId: "me" | string = myNorm && senderNorm === myNorm ? "me" : senderNorm;

  return {
    id: normalizeId(raw.messageId),
    threadId,
    type: "TEXT",
    text: raw.content ?? "",
    senderId: senderId === "me" ? "me" : normalizeId(senderId),
    createdAt: createdAtFallback,
    isRead: true,
  };
};

export const mapDMThreadRawToUI = (raw: DMThreadRaw, fetchedAt: ISODateTimeString = nowIso()): DMThread => {
  const threadId = normalizeId(raw.roomId);
  const otherUser = {
    id: normalizeId(raw.opponentId),
    nickname: raw.opponentNickname?.trim() ? raw.opponentNickname : "알 수 없음",
    avatarUrl: img(raw.opponentProfileImageName),
  };

  const lastMessage: DMMessage = {
    id: `${threadId}:last`,
    threadId,
    type: "TEXT",
    text: raw.lastMessageContent ?? "",
    senderId: otherUser.id,
    createdAt: fetchedAt,
    isRead: (raw.unReadCount ?? 0) === 0,
  };

  return {
    id: threadId,
    otherUser,
    lastMessage,
    unreadCount: raw.unReadCount ?? 0,
    updatedAt: fetchedAt,
    createdAt: undefined,
    relatedMeetingId: raw.postId != null ? normalizeId(raw.postId) : undefined,
    relatedMeetingTitle: undefined,
    relatedMeeting: raw.postId != null ? { id: normalizeId(raw.postId), title: "" } : undefined,
  };
};

/**
 * OpenAPI MessageRoomResponse -> DMThread(UI)
 * - 서버에 updatedAt/createdAt이 없으므로 fetchedAt 주입
 */
export const mapMessageRoomToDMThread = (room: MessageRoomResponse, fetchedAt: ISODateTimeString): DMThread =>
  mapDMThreadRawToUI(room as DMThreadRaw, fetchedAt);

export const mapMessageRoomsToDMThreads = (rooms: MessageRoomResponse[], fetchedAt: ISODateTimeString): DMThread[] =>
  rooms.map((room) => mapMessageRoomToDMThread(room, fetchedAt));

/**
 * OpenAPI Message -> DMMessage(UI)
 * - 서버에 createdAt/isRead가 없으므로 fallback 주입(정렬/렌더 안정)
 */
export const mapApiMessageToDMMessage = (
  msg: Message,
  myLoginId?: string,
  createdAtFallback: ISODateTimeString = nowIso(),
): DMMessage => mapDMMessageRawToUI(msg as DMMessageRaw, myLoginId, createdAtFallback);

export const mapApiMessagesToDMMessages = (messages: Message[], myLoginId?: string): DMMessage[] => {
  const baseMs = Date.now() - Math.max(messages.length - 1, 0) * 1000;

  return messages.map((m, idx) => {
    const createdAt = new Date(baseMs + idx * 1000).toISOString() as ISODateTimeString;
    return mapApiMessageToDMMessage(m, myLoginId, createdAt);
  });
};

export const mapDMTextToPlainBody = (text: string): string => text;

/*
요약:
1) v1.2.4 MessageRoomResponse/Message 스키마에 맞춰 타입/필드명(opponentProfileImageName 등) 정합.
2) avatarUrl은 /images/{filename} 경로로 매핑(endpoints.images.get).
3) createdAt/isRead는 명세에 없어서 fetchedAt/순번 기반 fallback만 최소 주입.
*/