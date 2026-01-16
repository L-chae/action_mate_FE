import type { DMMessage, DMThread } from "./types";

/**
 * ✅ DM 목업 원본 전용
 * - DM이 Meeting과 연결되도록 relatedMeetingId를 meetings seed id(101, 104...)에 맞춤
 */

const now = Date.now();
const minAgo = (m: number) => new Date(now - m * 60_000).toISOString();
const hourAgo = (h: number) => new Date(now - h * 3600_000).toISOString();

// --- Mock Threads ---
export const DM_THREADS_SEED: DMThread[] = [
  {
    id: "t1",
    otherUser: { id: "u2", nickname: "배드민턴고수" },
    lastMessage: {
      id: "m10",
      text: "네, 잠원지구 주차장에서 뵐게요!",
      senderId: "u2",
      createdAt: minAgo(5),
      isRead: false,
    },
    unreadCount: 1,
    updatedAt: minAgo(5),
    relatedMeetingId: "101", // ✅ meetingMockData의 배드민턴(101)
    relatedMeetingTitle: "🏸 배드민턴 2게임만 (초보 환영)",
  },
  {
    id: "t2",
    otherUser: { id: "u3", nickname: "보드게임마스터" },
    lastMessage: {
      id: "m20",
      text: "혹시 늦으시나요?",
      senderId: "me",
      createdAt: hourAgo(2),
      isRead: true,
    },
    unreadCount: 0,
    updatedAt: hourAgo(2),
    relatedMeetingId: "104", // ✅ meetingMockData의 보드게임(104)
    relatedMeetingTitle: "🎲 보드게임 가볍게 한 판",
  },
  {
    id: "t3",
    otherUser: { id: "u4", nickname: "맛집러" },
    lastMessage: {
      id: "m30",
      text: "메뉴는 파스타로 가도 괜찮으세요?",
      senderId: "u4",
      createdAt: minAgo(35),
      isRead: false,
    },
    unreadCount: 2,
    updatedAt: minAgo(35),
    relatedMeetingId: "110", // ✅ 동탄 파스타(110)
    relatedMeetingTitle: "🍝 동탄 타임테라스 파스타",
  },
];

// --- Mock Messages ---
export const DM_MESSAGES_SEED: Record<string, DMMessage[]> = {
  t1: [
    {
      id: "m1",
      text: "안녕하세요! 배드민턴 참여 신청했습니다.",
      senderId: "me",
      createdAt: hourAgo(1),
      isRead: true,
    },
    {
      id: "m2",
      text: "반갑습니다! 라켓 있으신가요?",
      senderId: "u2",
      createdAt: minAgo(50),
      isRead: true,
    },
    {
      id: "m3",
      text: "네 개인 라켓 들고갈게요 ㅎㅎ",
      senderId: "me",
      createdAt: minAgo(10),
      isRead: true,
    },
    {
      id: "m10",
      text: "네, 잠원지구 주차장에서 뵐게요!",
      senderId: "u2",
      createdAt: minAgo(5),
      isRead: false,
    },
  ],
  t2: [
    {
      id: "m20",
      text: "혹시 늦으시나요?",
      senderId: "me",
      createdAt: hourAgo(2),
      isRead: true,
    },
  ],
  t3: [
    {
      id: "m31",
      text: "안녕하세요! 동탄 파스타 모임 문의드려요.",
      senderId: "me",
      createdAt: minAgo(60),
      isRead: true,
    },
    {
      id: "m32",
      text: "반가워요! 취향 있으시면 말씀해주세요 🙂",
      senderId: "u4",
      createdAt: minAgo(45),
      isRead: true,
    },
    {
      id: "m30",
      text: "메뉴는 파스타로 가도 괜찮으세요?",
      senderId: "u4",
      createdAt: minAgo(35),
      isRead: false,
    },
    {
      id: "m33",
      text: "그리고 혹시 알레르기 있으신가요?",
      senderId: "u4",
      createdAt: minAgo(34),
      isRead: false,
    },
  ],
};
