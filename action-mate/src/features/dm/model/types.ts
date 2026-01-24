// src/features/dm/model/types.ts
import type { ISODateTimeString, Id, NormalizedId, UserSummary, UserSummaryRaw } from "@/shared/model/types";

/**
 * ✅ DM도 Raw vs UI 모델을 분리합니다.
 * - 서버 응답은 DMMessageRaw/DMThreadRaw로 받고
 * - 화면에서는 DMMessage/DMThread(UI, id가 문자열로 정규화된 모델)만 쓰는 방식 권장
 */

/** -----------------------
 * Raw (서버 응답용)
 * ---------------------- */

export type DMMessageRaw = {
  id: Id;
  threadId?: Id;
  type?: "TEXT" | "SYSTEM";
  text: string;

  /**
   * 기존 로직("me") 호환
   * - 서버 id 기반으로도 들어올 수 있으니 Id 허용
   */
  senderId: "me" | Id;

  createdAt: ISODateTimeString;
  isRead: boolean;
};

export type DMThreadRaw = {
  id: Id;
  otherUser: UserSummaryRaw;
  lastMessage: DMMessageRaw;
  unreadCount: number;
  updatedAt: ISODateTimeString;
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
 * - id는 문자열로 표준화된 상태를 가정
 * ---------------------- */

export type DMMessage = {
  id: NormalizedId;
  threadId?: NormalizedId;
  type?: "TEXT" | "SYSTEM";
  text: string;

  /**
   * ✅ UI에서는 비교/렌더 안정성을 위해 senderId도 문자열로 표준화
   * - "me"는 기존 로직 유지 목적
   */
  senderId: "me" | NormalizedId;

  createdAt: ISODateTimeString;
  isRead: boolean;
};

export type DMThread = {
  id: NormalizedId;

  // 공통 UserSummary(UI 모델) 사용
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