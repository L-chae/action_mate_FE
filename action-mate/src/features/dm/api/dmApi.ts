// src/features/dm/api/dmApi.ts
import type { ISODateTimeString } from "@/shared/model/types";
import type { ApiMessage, MessageRoomResponse } from "@/shared/api/schemas";
import { client } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/api/endpoints";
import { getCurrentUserId } from "@/shared/api/authToken";
import { ensureArray } from "@/shared/model/mappers";
import { mapApiMessagesToDMMessages, mapDMTextToPlainBody, mapMessageRoomsToDMThreads } from "../model/mappers";
import type { DMMessage, DMThread } from "../model/types";
import { nowIso as nowIsoShared } from "@/shared/utils/timeText";
import { dmLocalService } from "./dmMockService";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export type DmService = {
  getThreads(): Promise<DMThread[]>;
  getThread(threadId: string): Promise<DMThread>;
  findThreadByMeetingId(meetingId: string): Promise<DMThread | null>;
  getMessages(threadId: string): Promise<DMMessage[]>;
  sendMessage(threadId: string, text: string): Promise<DMMessage>;
  markRead(threadId: string): Promise<void>;
};

type ApiMode = "mock" | "remote";

// -----------------------------------------------------------------------------
// Env / Mode
// -----------------------------------------------------------------------------
function parseEnvBool(v: unknown): boolean | undefined {
  if (v == null) return undefined;
  const s = String(v).trim().toLowerCase();
  if (!s) return undefined;
  if (s === "true" || s === "1" || s === "yes" || s === "y" || s === "on") return true;
  if (s === "false" || s === "0" || s === "no" || s === "n" || s === "off") return false;
  return undefined;
}

function resolveDmMode(): ApiMode {
  const dmFlag = parseEnvBool(process.env.EXPO_PUBLIC_USE_DM_MOCK);
  const globalFlag = parseEnvBool(process.env.EXPO_PUBLIC_USE_MOCK);

  if (!__DEV__) return "remote";

  const useMock = dmFlag ?? globalFlag ?? false;
  return useMock ? "mock" : "remote";
}

export const __DM_API_MODE__: ApiMode = resolveDmMode();
export const USE_DM_MOCK: boolean = __DM_API_MODE__ === "mock";

if (__DEV__) {
  // eslint-disable-next-line no-console
  console.log(`[DM Service] Mode: ${USE_DM_MOCK ? "MOCK (Fake Data)" : "REMOTE (Real Server)"}`);
}

// -----------------------------------------------------------------------------
// Shared helpers
// -----------------------------------------------------------------------------
const toMs = (iso?: string) => {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
};

const nowIso = (): ISODateTimeString => {
  const v = typeof nowIsoShared === "function" ? nowIsoShared() : new Date().toISOString();
  return (String(v || new Date().toISOString()) as unknown) as ISODateTimeString;
};

// -----------------------------------------------------------------------------
// Remote Service
// -----------------------------------------------------------------------------
function extractHttpStatus(e: unknown): number | undefined {
  return (e as any)?.response?.status;
}

export const dmRemoteService: DmService = {
  async getThreads(): Promise<DMThread[]> {
    const fetchedAt = nowIso();

    const { data } = await client.get<MessageRoomResponse | MessageRoomResponse[]>(endpoints.message.rooms);
    const rooms = ensureArray(data);

    return mapMessageRoomsToDMThreads(rooms, fetchedAt);
  },

  async getThread(threadId: string): Promise<DMThread> {
    const id = String(threadId ?? "").trim();
    if (!id) throw new Error("Thread ID is missing");

    const threads = await dmRemoteService.getThreads();
    const found = threads.find((t) => String((t as any)?.id) === id);
    if (!found) throw new Error("Thread not found");
    return found;
  },

  async findThreadByMeetingId(meetingId: string): Promise<DMThread | null> {
    const mid = String(meetingId ?? "").trim();
    if (!mid) return null;

    const threads = await dmRemoteService.getThreads();
    const found = threads.find((t) => String((t as any)?.relatedMeetingId ?? "") === mid);
    return found ?? null;
  },

  async getMessages(threadId: string): Promise<DMMessage[]> {
    const id = String(threadId ?? "").trim();
    if (!id) return [];

    const myLoginId = await getCurrentUserId();
    const { data } = await client.get<ApiMessage | ApiMessage[]>(endpoints.message.room(id));

    const list = mapApiMessagesToDMMessages(data, myLoginId ?? undefined);
    return [...(Array.isArray(list) ? list : [])].sort((a, b) => toMs((a as any)?.createdAt) - toMs((b as any)?.createdAt));
  },

  async sendMessage(threadId: string, text: string): Promise<DMMessage> {
    const id = String(threadId ?? "").trim();
    if (!id) throw new Error("Thread ID is required");

    const myLoginId = await getCurrentUserId();
    const trimmed = String(text ?? "").trim();
    if (!trimmed) throw new Error("메시지를 입력해주세요.");

    const bodyPlain = mapDMTextToPlainBody(trimmed);

    try {
      const { data } = await client.post<ApiMessage>(endpoints.message.room(id), bodyPlain, {
        headers: { "Content-Type": "text/plain" },
      });

      const [mapped] = mapApiMessagesToDMMessages([data], myLoginId ?? undefined);
      if (!mapped) throw new Error("메시지 전송 결과를 처리할 수 없습니다.");
      return mapped;
    } catch (e) {
      const st = extractHttpStatus(e);
      if (st === 415 || st === 400) {
        const { data } = await client.post<ApiMessage>(
          endpoints.message.room(id),
          { content: trimmed },
          { headers: { "Content-Type": "application/json" } }
        );

        const [mapped] = mapApiMessagesToDMMessages([data], myLoginId ?? undefined);
        if (!mapped) throw new Error("메시지 전송 결과를 처리할 수 없습니다.");
        return mapped;
      }
      throw e;
    }
  },

  async markRead(_threadId: string): Promise<void> {
    return;
  },
};

// -----------------------------------------------------------------------------
// Selected service + Public API (기존 dmApi.ts와 동일한 형태 유지)
// -----------------------------------------------------------------------------
export const dmService: DmService = USE_DM_MOCK ? dmLocalService : dmRemoteService;

export async function listDMThreads(): Promise<DMThread[]> {
  return dmService.getThreads();
}

export async function getDMThread(threadId: string): Promise<DMThread> {
  return dmService.getThread(threadId);
}

export async function findDMThreadByMeetingId(meetingId: string): Promise<DMThread | null> {
  return dmService.findThreadByMeetingId(meetingId);
}

export async function getDMMessages(threadId: string): Promise<DMMessage[]> {
  return dmService.getMessages(threadId);
}

export async function sendDMMessage(threadId: string, text: string): Promise<DMMessage> {
  return dmService.sendMessage(threadId, text);
}

export async function markDMThreadRead(threadId: string): Promise<void> {
  return dmService.markRead(threadId);
}

export default dmService;

// 3줄 요약
// - dmApi.ts에서 mock(로컬) 구현을 분리하고, dmMockService.ts를 import해 선택만 담당하게 정리했습니다.
// - mock/remote 모드 결정(USE_DM_MOCK)과 외부 공개 함수 시그니처는 그대로 유지했습니다.
// - 공용 유틸(nowIso/toMs)만 남겨 런타임 크래시 방어는 유지했습니다.
