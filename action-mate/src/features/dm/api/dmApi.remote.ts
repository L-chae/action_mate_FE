import { client } from "@/shared/api/apiClient";
import type { DMMessage, DMThread } from "../model/types";

/**
 * ✅ Remote API Service (Real Server Communication)
 * - 서버 DTO가 다르면 여기서만 매핑하세요(컴포넌트/폼에서 변환 금지).
 */

export const dmRemoteService = {
  async getThreads(): Promise<DMThread[]> {
    const { data } = await client.get<DMThread[]>("/dm/threads");
    return data;
  },

  async getThread(threadId: string): Promise<DMThread> {
    const { data } = await client.get<DMThread>(`/dm/threads/${threadId}`);
    return data;
  },

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

  async getMessages(threadId: string): Promise<DMMessage[]> {
    const { data } = await client.get<DMMessage[]>(`/dm/threads/${threadId}/messages`);
    return data;
  },

  async sendMessage(threadId: string, text: string): Promise<DMMessage> {
    const { data } = await client.post<DMMessage>(`/dm/threads/${threadId}/messages`, {
      text,
      type: "TEXT",
    });
    return data;
  },

  async markRead(threadId: string): Promise<void> {
    await client.patch(`/dm/threads/${threadId}/read`);
  },
};