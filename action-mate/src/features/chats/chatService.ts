import type { Message, Room } from "./types";

const ROOMS: Room[] = [
  { id: "1", postId: "1", title: "🏸 배드민턴 2게임만", lastMessage: "도착했어요!", updatedAtText: "방금", status: "ACTIVE" },
  { id: "3", postId: "3", title: "🎮 보드게임 가볍게", lastMessage: "몇 층인가요?", updatedAtText: "1시간 전", status: "ACTIVE" },
];

const MESSAGES: Record<string, Message[]> = {
  "1": [
    { id: "m1", roomId: "1", sender: "SYSTEM", content: "모임방이 생성되었습니다.", createdAtText: "19:01" },
    { id: "m2", roomId: "1", sender: "OTHER", content: "저는 파란 운동복이에요", createdAtText: "19:05" },
    { id: "m3", roomId: "1", sender: "ME", content: "도착했어요!", createdAtText: "19:07" },
  ],
};

export async function listRooms(): Promise<Room[]> {
  return ROOMS;
}

export async function listMessages(roomId: string): Promise<Message[]> {
  return MESSAGES[roomId] ?? [];
}

export async function sendMessage(roomId: string, content: string): Promise<{ ok: true }> {
  return { ok: true };
}
