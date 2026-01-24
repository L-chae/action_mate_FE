// src/features/dm/api/dmApi.remote.ts
import { client } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/api/endpoints";
import type { ApiMessage, MessageRoomResponse } from "@/shared/api/schemas";
import { getCurrentUserId } from "@/shared/api/authToken";
import { ensureArray } from "@/shared/model/mappers";
import {
  mapApiMessagesToDMMessages,
  mapDMTextToPlainBody,
  mapMessageRoomsToDMThreads,
} from "../model/mappers";
import type { DMMessage, DMThread } from "../model/types";

/**
 * ✅ Remote API Service (Real Server Communication)
 * - OpenAPI 기준:
 *   - GET  /message/room                : 채팅방 목록
 *   - GET  /message/room/{roomId}       : 메시지 목록
 *   - POST /message/room/{roomId}       : 메시지 전송(text/plain)
 *   - POST /message                     : (방이 없거나 모를 때) 방 생성/전송
 *
 * ⚠️ 서버 응답 DTO가 흔들려도 UI 모델은 DMThread/DMMessage로 고정되도록
 * mapper를 통해서만 변환합니다.
 */

const safeSortByUpdatedAtDesc = (threads: DMThread[]) => {
  // updatedAt이 비어있을 수 있으므로 "0 fallback"으로 안전 정렬
  const toMs = (iso?: string) => (iso ? new Date(iso).getTime() : 0);
  return [...threads].sort((a, b) => toMs(b.updatedAt) - toMs(a.updatedAt));
};

export const dmRemoteService = {
  async getThreads(): Promise<DMThread[]> {
    const { data } = await client.get<MessageRoomResponse | MessageRoomResponse[]>(endpoints.message.rooms);
    const rooms = ensureArray(data);
    const threads = mapMessageRoomsToDMThreads(rooms);

    // 서버가 updatedAt을 안 주는 경우가 있어도 안전하게 정렬(없으면 입력순 유지 효과)
    return safeSortByUpdatedAtDesc(threads);
  },

  async getThread(threadId: string): Promise<DMThread> {
    // 단건 메타 엔드포인트가 없으므로 목록에서 찾아옵니다.
    const threads = await dmRemoteService.getThreads();
    const found = threads.find((t) => String(t.id) === String(threadId));
    if (!found) throw new Error("Thread not found");
    return found;
  },

  async findThreadByMeetingId(meetingId: string): Promise<DMThread | null> {
    const threads = await dmRemoteService.getThreads();
    const found = threads.find((t) => String(t.relatedMeetingId ?? "") === String(meetingId));
    return found ?? null;
  },

  async getMessages(threadId: string): Promise<DMMessage[]> {
    const myLoginId = await getCurrentUserId();

    const { data } = await client.get<ApiMessage[]>(endpoints.message.room(threadId));
    // 서버 스펙에 createdAt이 없을 수 있으므로 mapper에서 기본값 정책 적용(현재는 "" 유지)
    return mapApiMessagesToDMMessages(data, myLoginId ?? undefined);
  },

  async sendMessage(threadId: string, text: string): Promise<DMMessage> {
    const myLoginId = await getCurrentUserId();

    // OpenAPI: text/plain body
    const body = mapDMTextToPlainBody(text);
    const { data } = await client.post<ApiMessage>(endpoints.message.room(threadId), body, {
      headers: { "Content-Type": "text/plain" },
    });

    // 단건도 배열 변환 mapper로 재사용
    const [mapped] = mapApiMessagesToDMMessages([data], myLoginId ?? undefined);
    return mapped;
  },

  async markRead(_threadId: string): Promise<void> {
    // OpenAPI에 "읽음 처리" 엔드포인트가 없음
    // - 서버 지원이 생기면 endpoints + mapper 추가 권장
    return;
  },
};