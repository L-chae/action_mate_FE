// src/features/dm/api/dmApi.ts
import type { DMMessage, DMThread } from "../model/types";

type DmService = {
  getThreads(): Promise<DMThread[]>;
  getThread(threadId: string): Promise<DMThread>;
  findThreadByMeetingId(meetingId: string): Promise<DMThread | null>;
  getMessages(threadId: string): Promise<DMMessage[]>;
  sendMessage(threadId: string, text: string): Promise<DMMessage>;
  markRead(threadId: string): Promise<void>;
};

type ApiMode = "mock" | "remote";

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
  console.log(`[DM Service] Mode: ${USE_DM_MOCK ? "MOCK (Fake Data)" : "REMOTE (Real Server)"}`);
}

/**
 * ✅ TS 오류(Nullable) 해결 포인트:
 * - _cached를 null 가능으로 두더라도, 외부에 노출/대입되는 값은 항상 DmService로 보장해야 합니다.
 * - getService는 항상 DmService를 return 하므로, _cached는 내부 캐시로만 사용합니다.
 */
let _cachedMode: ApiMode | null = null;
let _cachedSvc: DmService | null = null;

async function getService(): Promise<DmService> {
  const mode = __DM_API_MODE__;

  if (_cachedMode === mode && _cachedSvc) return _cachedSvc;

  if (mode === "mock") {
    const mod = await import("./dmApi.local");
    const svc = mod.dmLocalService as unknown as DmService;
    _cachedMode = mode;
    _cachedSvc = svc;
    return svc;
  }

  const mod = await import("./dmApi.remote");
  const svc = mod.dmRemoteService as unknown as DmService;
  _cachedMode = mode;
  _cachedSvc = svc;
  return svc;
}

export async function listDMThreads(): Promise<DMThread[]> {
  const svc = await getService();
  return svc.getThreads();
}

export async function getDMThread(threadId: string): Promise<DMThread> {
  const svc = await getService();
  return svc.getThread(threadId);
}

export async function findDMThreadByMeetingId(meetingId: string): Promise<DMThread | null> {
  const svc = await getService();
  return svc.findThreadByMeetingId(meetingId);
}

export async function getDMMessages(threadId: string): Promise<DMMessage[]> {
  const svc = await getService();
  return svc.getMessages(threadId);
}

export async function sendDMMessage(threadId: string, text: string): Promise<DMMessage> {
  const svc = await getService();
  return svc.sendMessage(threadId, text);
}

export async function markDMThreadRead(threadId: string): Promise<void> {
  const svc = await getService();
  return svc.markRead(threadId);
}