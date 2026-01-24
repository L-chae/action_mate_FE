// src/features/dm/model/types.ts
import type { ISODateTimeString, Id, NormalizedId, UserSummary, UserSummaryRaw } from "@/shared/model/types";

/**
 * ✅ DM 타입 점검/개선(실서비스/초보 친화)
 *
 * 목표
 * 1) Raw vs UI 분리: 서버 흔들림을 Raw에서 받고 UI는 항상 안정적인 타입 사용
 * 2) Id 표준화: UI는 NormalizedId(string) 기준으로 비교/키/캐시 안정
 * 3) 기본값 규칙: 서버가 일부 필드를 빼도 "깨지지 않게" 설계 (mapper에서 채움)
 *
 * 주의
 * - createdAt/isRead 등이 서버 명세에 없을 수 있으므로 Raw에서 optional로 두고
 *   UI에서는 required(화면 안정)로 유지하는 편이 안전합니다.
 */

/** -----------------------
 * Raw (서버 응답용)
 * - 서버 응답이 스펙과 다를 수 있어 optional을 넉넉히 둡니다.
 * ---------------------- */

export type DMMessageRaw = {
  id: Id;
  threadId?: Id;
  type?: "TEXT" | "SYSTEM";
  text?: string;

  /**
   * 서버는 보통 string id만 주지만, 기존 로직("me") 호환을 위해 유니온 유지
   */
  senderId?: "me" | Id;

  /**
   * ⚠️ OpenAPI Message에는 createdAt/isRead가 없음
   * -> Raw에서는 optional, UI에서는 required로 두고 mapper에서 기본값을 채웁니다.
   */
  createdAt?: ISODateTimeString;
  isRead?: boolean;
};

export type DMThreadRaw = {
  id: Id;

  /**
   * 서버 스키마가 user summary를 직접 안 주는 경우도 많아 optional로 방어
   * - 예: opponentId/opponentNickname 같이 평평한 형태
   */
  otherUser?: UserSummaryRaw;

  lastMessage?: DMMessageRaw;

  unreadCount?: number;

  /**
   * ⚠️ 서버가 updatedAt을 주지 않을 수 있으므로 optional
   * -> UI에서는 required(정렬/표시 안정)
   */
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
 * - id는 문자열로 표준화된 상태를 가정
 * - 화면이 안정적으로 그려지도록 핵심 필드는 required 유지
 * ---------------------- */

export type DMMessage = {
  id: NormalizedId;
  threadId: NormalizedId; // ✅ 메시지는 항상 스레드에 속하므로 required로 고정(사용처 단순화)
  type: "TEXT" | "SYSTEM";
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

  /**
   * 정렬/리스트 갱신 기준이 되는 필드라 required 유지
   * - 서버가 안 주면 mapper에서 lastMessage.createdAt 등으로 채움
   */
  updatedAt: ISODateTimeString;

  createdAt?: ISODateTimeString;

  relatedMeetingId?: NormalizedId;
  relatedMeetingTitle?: string;
  relatedMeeting?: {
    id: NormalizedId;
    title: string;
  };
};