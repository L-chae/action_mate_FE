// src/features/dm/api/dmApi.remote.ts
import { client } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/api/endpoints";
import type { ApiMessage, MessageRoomResponse } from "@/shared/api/schemas";
import { getCurrentUserId } from "@/shared/api/authToken";
import { ensureArray } from "@/shared/model/mappers";
import { mapApiMessagesToDMMessages, mapDMTextToPlainBody, mapMessageRoomsToDMThreads } from "../model/mappers";
import type { DMMessage, DMThread } from "../model/types";
import { nowIso } from "@/shared/utils/timeText";

const toMs = (iso?: string) => {
  const t = iso ? Date.parse(iso) : 0;
  return Number.isFinite(t) ? t : 0;
};

function extractHttpStatus(e: unknown): number | undefined {
  return (e as any)?.response?.status;
}

export const dmRemoteService = {
  async getThreads(): Promise<DMThread[]> {
    // 서버 스펙에 updatedAt이 없으므로 "호출 시점 1회"만 찍어서 흔들림 최소화
    const fetchedAt = nowIso();

    const { data } = await client.get<MessageRoomResponse | MessageRoomResponse[]>(endpoints.message.rooms);
    const rooms = ensureArray(data);

    // ✅ remote에서는 mock seed를 쓰지 않음. 서버가 준 배열 순서를 그대로 유지(정렬 X)
    return mapMessageRoomsToDMThreads(rooms, fetchedAt);
  },

  async getThread(threadId: string): Promise<DMThread> {
    if (!threadId) throw new Error("Thread ID is missing");
    const threads = await dmRemoteService.getThreads();
    const found = threads.find((t) => String(t.id) === String(threadId));
    if (!found) throw new Error("Thread not found");
    return found;
  },

  async findThreadByMeetingId(meetingId: string): Promise<DMThread | null> {
    if (!meetingId) return null;
    const threads = await dmRemoteService.getThreads();
    const found = threads.find((t) => String(t.relatedMeetingId ?? "") === String(meetingId));
    return found ?? null;
  },

  async getMessages(threadId: string): Promise<DMMessage[]> {
    if (!threadId) return [];
    const myLoginId = await getCurrentUserId();

    const { data } = await client.get<ApiMessage | ApiMessage[]>(endpoints.message.room(threadId));

    const list = mapApiMessagesToDMMessages(data, myLoginId ?? undefined);
    return [...list].sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt));
  },

  async sendMessage(threadId: string, text: string): Promise<DMMessage> {
    if (!threadId) throw new Error("Thread ID is required");

    const myLoginId = await getCurrentUserId();
    const trimmed = String(text ?? "").trim();
    if (!trimmed) throw new Error("메시지를 입력해주세요.");

    const bodyPlain = mapDMTextToPlainBody(trimmed);

    try {
      const { data } = await client.post<ApiMessage>(endpoints.message.room(threadId), bodyPlain, {
        headers: { "Content-Type": "text/plain" },
      });

      const [mapped] = mapApiMessagesToDMMessages([data], myLoginId ?? undefined);
      return mapped;
    } catch (e) {
      // 서버가 text/plain을 안 받는 경우(415/400) JSON으로 1회 fallback
      const st = extractHttpStatus(e);
      if (st === 415 || st === 400) {
        const { data } = await client.post<ApiMessage>(
          endpoints.message.room(threadId),
          { content: trimmed },
          { headers: { "Content-Type": "application/json" } }
        );
        const [mapped] = mapApiMessagesToDMMessages([data], myLoginId ?? undefined);
        return mapped;
      }
      throw e;
    }
  },

  async markRead(_threadId: string): Promise<void> {
    return;
  },
};

export default dmRemoteService;