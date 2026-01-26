// src/features/dm/model/types.ts
import type { Id, NormalizedId, UserSummary } from "@/shared/model/types";

/**
 * DM 타입
 * - Raw: 서버 응답(명세 v1.2.4: /message/room, /message/room/{roomId})
 * - UI : 화면/상태관리(안정, 핵심 필드 required)
 */

/** -----------------------
 * Raw (서버 응답용)
 * ---------------------- */

// GET /message/room 응답 스키마(components.schemas.MessageRoomResponse)
export type DMThreadRaw = {
  roomId: number;
  opponentId: string;
  opponentNickname: string;
  opponentProfileImageName?: string;
  postId: number;
  unReadCount: number;
  lastMessageContent: string;
};

// GET /message/room/{roomId} 응답 스키마(components.schemas.Message)
export type DMMessageRaw = {
  messageId: number;
  roomId: number;
  postId: number;
  postTitle: string;
  senderId: string;
  content: string;
};

/** -----------------------
 * UI (화면/상태관리용)
 * ---------------------- */

export type DMMessage = {
  id: NormalizedId;
  threadId: NormalizedId;
  type: "TEXT" | "SYSTEM";
  text: string;

  // room 목록에서는 sender 정보를 알 수 없어 optional로 둠(상세 조회에서 채움)
  senderId?: "me" | NormalizedId;

  // 백엔드 명세에 시간/읽음 여부가 없으므로 UI에서는 optional
  createdAt?: string;
  isRead?: boolean;
};

export type DMThread = {
  id: NormalizedId;
  otherUser: UserSummary;

  // room 목록은 lastMessageContent만 제공 → sender/createdAt 등은 optional인 DMMessage로 흡수
  lastMessage: DMMessage;
  unreadCount: number;

  // 백엔드 명세에 updatedAt/createdAt이 없어 optional
  updatedAt?: string;
  createdAt?: string;

  // DM이 특정 게시글(모임)과 연결됨(postId)
  relatedMeetingId?: NormalizedId;
  relatedMeetingTitle?: string;
  relatedMeeting?: {
    id: NormalizedId;
    title: string;
  };
};

/*
요약:
1) v1.2.4 MessageRoomResponse/Message 스키마에 맞춰 Raw(DMThreadRaw/DMMessageRaw) 구조를 확정.
2) 서버에 없는 createdAt/isRead/senderId는 UI 타입에서 optional로 두어 화면 요구사항과 충돌 방지.
3) roomId(채팅방)와 postId(관련 모임) 중심으로 UI에서 thread/meeting 연결 가능하게 유지.
*/