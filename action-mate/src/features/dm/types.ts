export type UserSummary = {
  id: string;
  nickname: string;
  avatarUrl?: string; // 없을 경우 기본 아이콘 사용
};

export type DMMessage = {
  id: string;
  text: string;
  senderId: string;
  createdAt: string; // ISO string
  isRead: boolean;
};

export type DMThread = {
  id: string;
  otherUser: UserSummary; // 대화 상대방
  lastMessage?: DMMessage;
  unreadCount: number;
  updatedAt: string;
  
  // Action Mate 특화: 어떤 모임 관련 대화인지 표시
  relatedMeetingId?: string;
  relatedMeetingTitle?: string;

};