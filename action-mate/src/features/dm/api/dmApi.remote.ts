// src/features/dm/api/dmApi.remote.ts
import { client } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/api/endpoints";
import type { ApiMessage, MessageRoomResponse } from "@/shared/api/schemas";
import { getCurrentUserId } from "@/shared/api/authToken";
import { ensureArray } from "@/shared/model/mappers";
import { mapApiMessagesToDMMessages, mapDMTextToPlainBody, mapMessageRoomsToDMThreads } from "../model/mappers";
import type { DMMessage, DMThread } from "../model/types";
import { nowIso } from "@/shared/utils/timeText"; // ✅ 공통 유틸 사용 권장

const toMs = (iso?: string) => {
  const t = iso ? Date.parse(iso) : 0;
  return Number.isFinite(t) ? t : 0;
};

export const dmRemoteService = {
  async getThreads(): Promise<DMThread[]> {
    // ⚠️ [중요] 서버 스펙 상 "채팅방 마지막 시간(updatedAt)"이 없습니다.
    // 기존처럼 new Date()를 넣으면 목록 새로고침마다 시간이 바뀌어 정렬이 튑니다.
    // 차라리 빈 값("")을 주어 "시간 정보 없음"으로 처리하거나,
    // 정렬은 전적으로 서버가 준 순서(배열 인덱스)를 따르는 것이 UX상 낫습니다.
    const fallbackTime = nowIso(); 

    const { data } = await client.get<MessageRoomResponse | MessageRoomResponse[]>(endpoints.message.rooms);
    const rooms = ensureArray(data);

    // Mapper에게 fallbackTime을 넘기되, UI에서는 서버가 준 순서를 믿어야 함
    return mapMessageRoomsToDMThreads(rooms, fallbackTime);
  },

  async getThread(threadId: string): Promise<DMThread> {
    // 🚨 404 방어: threadId가 없으면 호출 불가
    if (!threadId) throw new Error("Thread ID is missing");

    // 단건 조회 API가 없어서 목록에서 찾음
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
    if (!threadId) return []; // 🚨 404 방어

    const myLoginId = await getCurrentUserId();
    const { data } = await client.get<ApiMessage | ApiMessage[]>(endpoints.message.room(threadId));
    
    // Mapper 내부에서 fallback 시간을 생성하여 메시지 정렬 보정
    const list = mapApiMessagesToDMMessages(data, myLoginId ?? undefined);

    // 시간 오름차순 (과거 -> 최신) 정렬
    return [...list].sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt));
  },

  async sendMessage(threadId: string, text: string): Promise<DMMessage> {
    if (!threadId) throw new Error("Thread ID is required");

    const myLoginId = await getCurrentUserId();
    const trimmed = text.trim();
    if (!trimmed) throw new Error("메시지를 입력해주세요.");

    // ⚠️ [체크포인트] 서버가 text/plain을 확실히 지원하나요?
    // 보통 JSON ({ content: text }) 형식을 많이 씁니다.
    // 400/415 에러가 나면 백엔드 개발자에게 "Body 포맷이 JSON인지 Text인지" 물어보세요.
    const body = mapDMTextToPlainBody(trimmed);
    
    const { data } = await client.post<ApiMessage>(endpoints.message.room(threadId), body, {
      headers: { "Content-Type": "text/plain" },
    });

    const [mapped] = mapApiMessagesToDMMessages([data], myLoginId ?? undefined);
    return mapped;
  },

  async markRead(_threadId: string): Promise<void> {
    // 서버에 읽음 처리 API가 없다면 빈 함수 유지
    return;
  },
};