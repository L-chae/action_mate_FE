// src/features/dm/model/mappers.ts
import type {
  ApiMessage,
  EnsureRoomAndSendMessageRequest,
  MessageRoomResponse,
} from "@/shared/api/schemas";
import { normalizeId } from "@/shared/model/types";
import { ensureArray, normalizeIdSafe } from "@/shared/model/mappers";
import type { DMMessage, DMThread } from "@/features/dm/model/types";

/**
 * 서버 Message(Room/Message) 스키마를 DM(UI) 모델로 변환합니다.
 * - 서버 응답에 createdAt/isRead 등이 없는 부분이 있어 "UI 기본값"이 필요합니다.
 * - senderId도 마지막 메시지에서는 알 수 없을 수 있어, UI는 senderId에 과하게 의존하지 않는 게 안전합니다.
 */

export const mapMessageRoomToDMThread = (room: MessageRoomResponse): DMThread => {
  const threadId = normalizeId(room.roomId);
  const otherUserId = normalizeId(room.opponentId);

  return {
    id: threadId,
    otherUser: {
      id: otherUserId,
      nickname: room.opponentNickname ?? "알 수 없음",
      avatarUrl: room.opponentProfileImageUrl ?? null,
    },
    lastMessage: {
      id: `${threadId}:last`,
      threadId,
      type: "TEXT",
      text: room.lastMessageContent ?? "",
      senderId: otherUserId, // 서버가 미제공 → 정책적으로 상대방으로 둠
      createdAt: "", // 서버 스펙에 없음
      isRead: (room.unReadCount ?? 0) === 0,
    },
    unreadCount: room.unReadCount ?? 0,
    updatedAt: "", // 서버 스펙에 없음(필요하면 별도 API/필드 요청)
    createdAt: undefined,

    relatedMeetingId: normalizeIdSafe(room.postId, "0"),
    relatedMeetingTitle: undefined,
    relatedMeeting: room.postId
      ? {
          id: normalizeId(room.postId),
          title: "", // 서버 목록에는 postTitle 없음
        }
      : undefined,
  };
};

export const mapMessageRoomsToDMThreads = (
  value: MessageRoomResponse | MessageRoomResponse[] | null | undefined,
): DMThread[] => ensureArray(value).map(mapMessageRoomToDMThread);

export const mapApiMessageToDMMessage = (msg: ApiMessage, myLoginId?: string): DMMessage => {
  const sender = normalizeId(msg.senderId);
  const senderId = myLoginId && sender === myLoginId ? "me" : sender;

  return {
    id: normalizeId(msg.messageId),
    threadId: normalizeId(msg.roomId),
    type: "TEXT",
    text: msg.content ?? "",
    senderId,
    createdAt: "", // 서버 스펙에 없음
    isRead: true, // 서버 스펙에 없음 → 채팅방 진입 시 읽힘으로 보는 단순 정책
  };
};

export const mapApiMessagesToDMMessages = (
  value: ApiMessage | ApiMessage[] | null | undefined,
  myLoginId?: string,
): DMMessage[] => ensureArray(value).map((m) => mapApiMessageToDMMessage(m, myLoginId));

/**
 * 쪽지 보내기(채팅방 없거나 모를 때) 요청 생성
 */
export const mapEnsureRoomAndSendMessageToRequest = (input: {
  postId: number;
  receiverId: string;
  content: string;
}): EnsureRoomAndSendMessageRequest => ({
  postId: input.postId,
  receiverId: input.receiverId,
  content: input.content,
});

/**
 * 쪽지 보내기(채팅방 id를 알고 있을 때) - text/plain
 * - 별도 변환 없이 그대로 보내면 됩니다.
 */
export const mapDMTextToPlainBody = (text: string): string => text;