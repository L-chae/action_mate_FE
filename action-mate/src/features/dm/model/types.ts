// src/features/dm/model/types.ts
import type { ISODateTimeString, Id, NormalizedId, UserSummary, UserSummaryRaw } from "@/shared/model/types";

/**
 * DM 타입
 * - Raw: 서버/목업 원본(불안정, optional 허용)
 * - UI : 화면/상태관리(안정, 핵심 필드 required)
 */

/** -----------------------
 * Raw (서버 응답/목업 원본용)
 * ---------------------- */
export type DMMessageRaw = {
  id: Id;
  threadId?: Id;
  type?: "TEXT" | "SYSTEM";
  text?: string;
  senderId?: "me" | Id;
  createdAt?: ISODateTimeString;
  isRead?: boolean;
};

export type DMThreadRaw = {
  id: Id;
  otherUser?: UserSummaryRaw;
  lastMessage?: DMMessageRaw;
  unreadCount?: number;
  updatedAt?: ISODateTimeString;
  createdAt?: ISODateTimeString;

  relatedMeetingId?: Id;
  relatedMeetingTitle?: string;
  relatedMeeting?: {
    id: Id;
    title: string;
  };
};

/** -----------------------
 * UI (화면/상태관리용)
 * ---------------------- */
export type DMMessage = {
  id: NormalizedId;
  threadId: NormalizedId;
  type: "TEXT" | "SYSTEM";
  text: string;
  senderId: "me" | NormalizedId;
  createdAt: ISODateTimeString;
  isRead: boolean;
};

export type DMThread = {
  id: NormalizedId;
  otherUser: UserSummary;

  lastMessage: DMMessage;
  unreadCount: number;

  updatedAt: ISODateTimeString;
  createdAt?: ISODateTimeString;

  relatedMeetingId?: NormalizedId;
  relatedMeetingTitle?: string;
  relatedMeeting?: {
    id: NormalizedId;
    title: string;
  };
};