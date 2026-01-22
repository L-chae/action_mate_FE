import { UserSummary } from "@/shared/model/types";

// DMMessage 타입
export type DMMessage = {
  id: string;
  threadId?: string;
  type?: "TEXT" | "SYSTEM";
  text: string;
  senderId: "me" | string;
  createdAt: string; 
  isRead: boolean;
};

// DMThread 타입
export type DMThread = {
  id: string;
  
  // ✅ 공통 타입 사용 (기존에 정의했던 UserSummary와 동일)
  otherUser: UserSummary; 

  lastMessage: DMMessage;
  unreadCount: number;
  updatedAt: string;
  createdAt?: string;
  relatedMeetingId?: string;
  relatedMeetingTitle?: string;
  relatedMeeting?: {
    id: string;
    title: string;
  };
};