// src/features/dm/model/mappers.ts
import type { ApiMessage, MessageRoomResponse } from "@/shared/api/schemas";
import type { ISODateTimeString, NormalizedId,UserSummary } from "@/shared/model/types";
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

const safeAvatarUrl = (v: unknown): string | null => {
  if (v == null) return null;
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
};

const safeUserSummary = (raw?: unknown): UserSummary => {
  const r = (raw ?? {}) as any;

  // 서버/목업 혼재 방어:
  // - avatarUrl / profileImageUrl / opponentProfileImageUrl
  // - nickname / writerNickname / opponentNickname
  const nickname =
    typeof r.nickname === "string" && r.nickname.trim()
      ? r.nickname
      : typeof r.writerNickname === "string" && r.writerNickname.trim()
        ? r.writerNickname
        : typeof r.opponentNickname === "string" && r.opponentNickname.trim()
          ? r.opponentNickname
          : "알 수 없음";

  const avatarUrl =
    safeAvatarUrl(r.avatarUrl) ?? safeAvatarUrl(r.profileImageUrl) ?? safeAvatarUrl(r.opponentProfileImageUrl);

  return {
    id: normalizeId(r.id ?? "unknown"),
    nickname,
    avatarUrl,
  };
};

export const mapDMMessageRawToUI = (raw: DMMessageRaw, threadIdFallback?: string, myId?: string): DMMessage => {
  const threadId = normalizeId(raw?.threadId ?? threadIdFallback ?? "unknown");

  const rawSender = raw?.senderId === "me" ? "me" : normalizeId(raw?.senderId ?? "unknown");
  const myNorm = myId ? normalizeId(myId) : undefined;

  // 서버는 senderId를 내 id로 줄 수 있고, UI는 "me"로 비교하는 기존 로직 유지
  const senderId: "me" | string = myNorm && rawSender !== "me" && rawSender === myNorm ? "me" : rawSender;

  return {
    id: normalizeId(raw?.id ?? `${threadId}:${Date.now()}`),
    threadId,
    type: raw?.type ?? "TEXT",
    text: safeText(raw?.text, ""),
    senderId: senderId === "me" ? "me" : normalizeId(senderId),
    createdAt: safeIso(raw?.createdAt, nowIso()),
    isRead: safeBool(raw?.isRead, true),
  };
};

export const mapDMThreadRawToUI = (raw: DMThreadRaw, myId?: string): DMThread => {
  const id = normalizeId(raw?.id ?? "unknown");

  const lastRaw: DMMessageRaw =
    raw?.lastMessage ??
    ({
      id: `${id}:last`,
      threadId: id,
      type: "SYSTEM",
      text: "대화를 시작해보세요.",
      senderId: "me",
      createdAt: raw?.updatedAt ?? raw?.createdAt ?? nowIso(),
      isRead: true,
    } as DMMessageRaw);

  const lastMessage = mapDMMessageRawToUI(lastRaw, id, myId);

  return {
    id,
    otherUser: safeUserSummary(raw?.otherUser),
    lastMessage,
    unreadCount: typeof raw?.unreadCount === "number" ? raw.unreadCount : 0,
    updatedAt: safeIso(raw?.updatedAt, lastMessage.createdAt),
    createdAt: raw?.createdAt,
    relatedMeetingId: raw?.relatedMeetingId != null ? normalizeId(raw.relatedMeetingId) : undefined,
    relatedMeetingTitle: typeof raw?.relatedMeetingTitle === "string" ? raw.relatedMeetingTitle : undefined,
    relatedMeeting:
      raw?.relatedMeeting && raw.relatedMeeting.id != null
        ? { id: normalizeId(raw.relatedMeeting.id), title: safeText(raw.relatedMeeting.title, "") }
        : undefined,
  };
};

/**
 * OpenAPI MessageRoomResponse -> DMThread(UI)
 * - 서버 응답에 updatedAt/createdAt이 없어서 fetchedAt을 주입(정렬/표시 안정)
 */
export const mapMessageRoomToDMThread = (
  room: MessageRoomResponse,
  fetchedAt: ISODateTimeString,
  myLoginId?: string,
): DMThread => {
  const threadId = normalizeId((room as any)?.roomId ?? "unknown");
  const opponentId = normalizeId((room as any)?.opponentId ?? "unknown");

  // lastMessage sender 정보가 서버에 없으니, "내가 보낸 마지막" 가능성만이라도 유지:
  // - 서버가 lastMessageSenderId 같은 필드를 주면 여기서 치환하면 됨
  const lastSenderId: "me" | NormalizedId = "me" as any;

  const lastMessage: DMMessage = {
    id: normalizeId(`${threadId}:last`),
    threadId,
    type: "TEXT",
    text: safeText((room as any)?.lastMessageContent, ""),
    senderId: myLoginId ? lastSenderId : opponentId,
    createdAt: fetchedAt,
    isRead: Number((room as any)?.unReadCount ?? 0) === 0,
  };

  return {
    id: threadId,
    otherUser: {
      id: opponentId,
      nickname: safeText((room as any)?.opponentNickname, "알 수 없음"),
      avatarUrl: safeAvatarUrl((room as any)?.opponentProfileImageUrl),
    },
    lastMessage,
    unreadCount: Number((room as any)?.unReadCount ?? 0) || 0,
    updatedAt: fetchedAt,
    createdAt: undefined,
    relatedMeetingId: (room as any)?.postId != null ? normalizeId((room as any).postId) : undefined,
    relatedMeetingTitle: undefined,
    relatedMeeting:
      (room as any)?.postId != null ? { id: normalizeId((room as any).postId), title: "" } : undefined,
  };
};

export const mapMessageRoomsToDMThreads = (
  value: MessageRoomResponse | MessageRoomResponse[] | null | undefined,
  fetchedAt: ISODateTimeString,
  myLoginId?: string,
): DMThread[] => ensureArray(value).map((room) => mapMessageRoomToDMThread(room, fetchedAt, myLoginId));

/**
 * OpenAPI ApiMessage -> DMMessage(UI)
 * - 서버에 createdAt/isRead가 없으므로 fallback 주입
 */
export const mapApiMessageToDMMessage = (
  msg: ApiMessage,
  myLoginId?: string,
  createdAtFallback?: ISODateTimeString,
): DMMessage => {
  const threadId = normalizeId((msg as any)?.roomId ?? "unknown");
  const sender = normalizeId((msg as any)?.senderId ?? "unknown");
  const senderId: "me" | string = myLoginId && sender === normalizeId(myLoginId) ? "me" : sender;

  return {
    id: normalizeId((msg as any)?.messageId ?? `${threadId}:${Date.now()}`),
    threadId,
    type: "TEXT",
    text: safeText((msg as any)?.content, ""),
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
  const baseMs = Date.now() - Math.max(arr.length - 1, 0) * 1000;

  return arr.map((m, idx) => {
    const createdAt = new Date(baseMs + idx * 1000).toISOString() as ISODateTimeString;
    return mapApiMessageToDMMessage(m, myLoginId, createdAt);
  });
};

export const mapDMTextToPlainBody = (text: string): string => text;