// src/features/dm/api/dmMockData.ts
import type { DMMessage, DMThread } from "../model/types";
// ✅ 모임 데이터를 가져와서 참조 (경로는 실제 파일 위치에 맞춰 조정하세요)
import { MOCK_MEETINGS_SEED } from "@/features/meetings/mocks/meetingMockData"; 

/**
 * DM 목업 데이터
 * - UI 안정성을 위해 threadId/type/createdAt/isRead를 채워둠
 * - relatedMeetingId는 meetings seed id와 동기화
 */

const now = Date.now();
const minAgo = (m: number) => new Date(now - m * 60_000).toISOString();
const hourAgo = (h: number) => new Date(now - h * 3600_000).toISOString();

// ✅ 헬퍼: 모임 ID로 제목 찾기 (데이터 불일치 방지)
const getMeetingTitle = (id: string) => {
  const m = MOCK_MEETINGS_SEED.find((item: any) => String(item.id) === id);
  return m?.title ?? "삭제된 모임";
};

// Threads
export const DM_THREADS_SEED: DMThread[] = [
  {
    id: "t1",
    otherUser: { id: "u2", nickname: "배드민턴고수", avatarUrl: null },
    lastMessage: {
      id: "m10",
      threadId: "t1",
      type: "TEXT",
      text: "네, 잠원지구 주차장에서 뵐게요!",
      senderId: "u2",
      createdAt: minAgo(5),
      isRead: false,
    },
    unreadCount: 1,
    updatedAt: minAgo(5),
    relatedMeetingId: "101",
    // ✅ 하드코딩 제거 -> 실제 데이터 참조
    relatedMeetingTitle: getMeetingTitle("101"), 
  },
  {
    id: "t2",
    otherUser: { id: "u3", nickname: "보드게임마스터", avatarUrl: null },
    lastMessage: {
      id: "m20",
      threadId: "t2",
      type: "TEXT",
      text: "혹시 늦으시나요?",
      senderId: "me",
      createdAt: hourAgo(2),
      isRead: true,
    },
    unreadCount: 0,
    updatedAt: hourAgo(2),
    relatedMeetingId: "104",
    // ✅ 참조
    relatedMeetingTitle: getMeetingTitle("104"),
  },
  {
    id: "t3",
    otherUser: { id: "u4", nickname: "맛집러", avatarUrl: null },
    lastMessage: {
      id: "m30",
      threadId: "t3",
      type: "TEXT",
      text: "메뉴는 파스타로 가도 괜찮으세요?",
      senderId: "u4",
      createdAt: minAgo(35),
      isRead: false,
    },
    unreadCount: 2,
    updatedAt: minAgo(35),
    relatedMeetingId: "110",
    // ✅ 참조
    relatedMeetingTitle: getMeetingTitle("110"),
  },
];

// Messages (여기는 변경 없음)
export const DM_MESSAGES_SEED: Record<string, DMMessage[]> = {
  t1: [
    {
      id: "m1",
      threadId: "t1",
      type: "TEXT",
      text: "안녕하세요! 배드민턴 참여 신청했습니다.",
      senderId: "me",
      createdAt: hourAgo(1),
      isRead: true,
    },
    {
      id: "m2",
      threadId: "t1",
      type: "TEXT",
      text: "반갑습니다! 라켓 있으신가요?",
      senderId: "u2",
      createdAt: minAgo(50),
      isRead: true,
    },
    {
      id: "m3",
      threadId: "t1",
      type: "TEXT",
      text: "네 개인 라켓 들고갈게요 ㅎㅎ",
      senderId: "me",
      createdAt: minAgo(10),
      isRead: true,
    },
    {
      id: "m10",
      threadId: "t1",
      type: "TEXT",
      text: "네, 잠원지구 주차장에서 뵐게요!",
      senderId: "u2",
      createdAt: minAgo(5),
      isRead: false,
    },
  ],
  t2: [
    {
      id: "m20",
      threadId: "t2",
      type: "TEXT",
      text: "혹시 늦으시나요?",
      senderId: "me",
      createdAt: hourAgo(2),
      isRead: true,
    },
  ],
  t3: [
    {
      id: "m31",
      threadId: "t3",
      type: "TEXT",
      text: "안녕하세요! 동탄 파스타 모임 문의드려요.",
      senderId: "me",
      createdAt: minAgo(60),
      isRead: true,
    },
    {
      id: "m32",
      threadId: "t3",
      type: "TEXT",
      text: "반가워요! 취향 있으시면 말씀해주세요 🙂",
      senderId: "u4",
      createdAt: minAgo(45),
      isRead: true,
    },
    {
      id: "m30",
      threadId: "t3",
      type: "TEXT",
      text: "메뉴는 파스타로 가도 괜찮으세요?",
      senderId: "u4",
      createdAt: minAgo(35),
      isRead: false,
    },
    {
      id: "m33",
      threadId: "t3",
      type: "TEXT",
      text: "그리고 혹시 알레르기 있으신가요?",
      senderId: "u4",
      createdAt: minAgo(34),
      isRead: false,
    },
  ],
};