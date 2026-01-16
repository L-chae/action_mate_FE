import type { DMThread, DMMessage } from "./types";

// --- Mock Data ---
const MOCK_THREADS: DMThread[] = [
  {
    id: "t1",
    otherUser: { id: "u2", nickname: "배드민턴고수" },
    lastMessage: {
      id: "m10",
      text: "네, 잠원지구 주차장에서 뵐게요!",
      senderId: "u2",
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      isRead: false,
    },
    unreadCount: 1,
    updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    relatedMeetingId: "1", // ✅ MeetingPost.id = "1" (배드민턴)
    relatedMeetingTitle: "🏸 배드민턴 2게임만",
  },
  {
    id: "t2",
    otherUser: { id: "u3", nickname: "보드게임마스터" },
    lastMessage: {
      id: "m20",
      text: "혹시 늦으시나요?",
      senderId: "me",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      isRead: true,
    },
    unreadCount: 0,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    relatedMeetingId: "3", // ✅ MeetingPost.id = "3" (보드게임)
    relatedMeetingTitle: "🎮 보드게임 가볍게",
  },
];

const MOCK_MESSAGES: Record<string, DMMessage[]> = {
  t1: [
    { id: "m1", text: "안녕하세요! 배드민턴 참여 신청했습니다.", senderId: "me", createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), isRead: true },
    { id: "m2", text: "반갑습니다! 라켓 있으신가요?", senderId: "u2", createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(), isRead: true },
    { id: "m3", text: "네 개인 라켓 들고갈게요 ㅎㅎ", senderId: "me", createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(), isRead: true },
    { id: "m10", text: "네, 잠원지구 주차장에서 뵐게요!", senderId: "u2", createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), isRead: false },
  ],
  t2: [{ id: "m20", text: "혹시 늦으시나요?", senderId: "me", createdAt: new Date().toISOString(), isRead: true }],
};

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

function sortByCreatedAtAsc(a: DMMessage, b: DMMessage) {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

function findThread(threadId: string) {
  return MOCK_THREADS.find((t) => t.id === threadId);
}

// 1) 채팅방 목록 조회
export async function listDMThreads(): Promise<DMThread[]> {
  await delay();
  return [...MOCK_THREADS].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

// 2) 특정 채팅방 메시지 조회 (오래된 -> 최신)
export async function getDMMessages(threadId: string): Promise<DMMessage[]> {
  await delay();
  const msgs = MOCK_MESSAGES[threadId] ? [...MOCK_MESSAGES[threadId]] : [];
  return msgs.sort(sortByCreatedAtAsc);
}

// 3) 메시지 전송
export async function sendDMMessage(threadId: string, text: string): Promise<DMMessage> {
  await delay();

  const newMessage: DMMessage = {
    id: Date.now().toString(),
    text,
    senderId: "me",
    createdAt: new Date().toISOString(),
    isRead: false,
  };

  if (MOCK_MESSAGES[threadId]) MOCK_MESSAGES[threadId].push(newMessage);
  else MOCK_MESSAGES[threadId] = [newMessage];

  const th = findThread(threadId);
  if (th) {
    th.lastMessage = newMessage;
    th.updatedAt = newMessage.createdAt;
  }

  return newMessage;
}
