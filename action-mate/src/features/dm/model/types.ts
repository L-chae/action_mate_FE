// src/features/dm/model/types.ts
import type { ISODateTimeString, Id, UserSummary } from "@/shared/model/types";

/**
 * DMMessage 타입
 */
export type DMMessage = {
  id: Id;
  threadId?: Id;
  type?: "TEXT" | "SYSTEM";
  text: string;

  /**
   * 기존 로직("me")을 유지하면서도, 실제 서버 id 기반으로도 동작 가능하게 합니다.
   * - 실무에서는 senderId === myId로 판별하는 편이 더 자연스럽지만
   *   기존 구현을 깨지 않기 위해 유니온을 유지합니다.
   */
  senderId: "me" | Id;

  createdAt: ISODateTimeString;
  isRead: boolean;
};

/**
 * DMThread 타입
 */
export type DMThread = {
  id: Id;

  // 공통 UserSummary 사용
  otherUser: UserSummary;

  lastMessage: DMMessage;
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