// features/dm/types.ts

export type UserSummary = {
  id: string;
  nickname: string;
  avatarUrl?: string; // 없을 경우 기본 아이콘 사용
};

/**
 * ✅ senderId: "me"를 명시적으로 허용
 * ✅ type 추가: 추후 시스템 메시지/이미지/알림 메시지 확장 가능
 */
export type DMMessage = {
  id: string;
  threadId?: string;         // (옵션) 메시지가 어디 스레드 소속인지 (유지보수 편함)
  type?: "TEXT" | "SYSTEM";  // 기본 TEXT
  text: string;
  senderId: "me" | string;
  createdAt: string; // ISO string
  isRead: boolean;   // 상대가 보낸 메시지일 때: 내가 읽었는지
};

/**
 * ✅ lastMessage는 리스트 렌더의 핵심 → optional 제거 추천
 * ✅ createdAt 추가: 스레드 생성 시점(정렬/디버깅/분석용)
 * ✅ relatedMeeting은 id/title을 같이 들고가되, 기존 필드명도 유지(호환)
 */
export type DMThread = {
  id: string;

  // 대화 상대방 (1:1 DM 기준)
  otherUser: UserSummary;

  // 스레드 리스트 카드 렌더에 반드시 필요
  lastMessage: DMMessage;

  // 내가 읽지 않은(상대가 보낸) 메시지 수
  unreadCount: number;

  // 마지막 활동 시각 (보통 lastMessage.createdAt과 동일하게 유지)
  updatedAt: string;

  // (옵션) 스레드 생성 시각
  createdAt?: string;

  // Action Mate 특화: 어떤 모임 관련 대화인지 표시
  relatedMeetingId?: string;
  relatedMeetingTitle?: string;

  // 확장용(선택)
  relatedMeeting?: {
    id: string;
    title: string;
  };
};
