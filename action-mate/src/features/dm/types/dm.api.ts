// src/features/dm/types/dm.api.ts

export type UserSummaryDTO = {
  id: string;
  nickname: string;
  avatarUrl?: string;
};

export type DMMessageDTO = {
  id: string;
  text: string;

  senderId: string;
  createdAt: string; // ISO

  /**
   * ⚠️ 추천: isRead 대신 readAt 또는 isReadByMe 같은 명확한 필드로
   * 초기에는 서버가 isRead를 주면 그대로 두되, 의미(내 기준/상대 기준)를 명세에 반드시 적기.
   */
  isRead: boolean;
};

export type DMThreadDTO = {
  id: string;

  otherUser: UserSummaryDTO;
  lastMessage?: DMMessageDTO;

  unreadCount: number;
  updatedAt: string; // ISO

  relatedMeetingId?: string;
  relatedMeetingTitle?: string;
};
