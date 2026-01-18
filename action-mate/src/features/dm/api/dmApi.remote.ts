import { client } from "@/shared/api/apiClient"; // Axios 인스턴스
import type { DMMessage, DMThread } from "../model/types";

/**
 * ✅ Remote API Service (Real Server Communication)
 * - 실제 백엔드 API 명세에 맞춰서 URL과 파라미터를 수정하면 됩니다.
 * - 서버 응답값(DTO)과 클라이언트 타입(Model)이 다를 경우 여기서 매핑(변환)합니다.
 */

export const dmRemoteService = {
  // 1) 채팅방 목록 조회
  async getThreads(): Promise<DMThread[]> {
    const { data } = await client.get<DMThread[]>("/dm/threads");
    return data; 
  },

  // 2) 채팅방 단건 조회
  async getThread(threadId: string): Promise<DMThread> {
    const { data } = await client.get<DMThread>(`/dm/threads/${threadId}`);
    return data;
  },

  // 3) 특정 모임과 연결된 채팅방 찾기 (없으면 null)
  // 서버에서 404를 줄지, null을 줄지에 따라 에러 처리가 달라질 수 있습니다.
  async findThreadByMeetingId(meetingId: string): Promise<DMThread | null> {
    try {
      const { data } = await client.get<DMThread>(`/dm/threads/search`, {
        params: { meetingId },
      });
      return data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  },

  // 4) 메시지 목록 조회
  async getMessages(threadId: string): Promise<DMMessage[]> {
    const { data } = await client.get<DMMessage[]>(`/dm/threads/${threadId}/messages`);
    return data;
  },

  // 5) 메시지 전송
  async sendMessage(threadId: string, text: string): Promise<DMMessage> {
    const { data } = await client.post<DMMessage>(`/dm/threads/${threadId}/messages`, {
      text,
      type: "TEXT", // 확장성을 위해 타입도 전송
    });
    return data;
  },

  // 6) 읽음 처리
  async markRead(threadId: string): Promise<void> {
    await client.patch(`/dm/threads/${threadId}/read`);
  },
};