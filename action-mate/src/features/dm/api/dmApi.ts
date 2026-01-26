import { dmLocalService } from "./dmApi.local";
import { dmRemoteService } from "./dmApi.remote";
import type { DMMessage, DMThread } from "../model/types";

/**
 * DM API Facade
 * * [수정됨] 404 에러 해결을 위해 강제로 Mock 모드를 켭니다.
 */

// ❌ 기존 코드 (환경변수가 없거나 false라서 Remote로 잡힘)
// export const USE_DM_MOCK = __DEV__ && process.env.EXPO_PUBLIC_USE_DM_MOCK === "true";

// ✅ 수정 코드 (무조건 true로 설정)
export const USE_DM_MOCK = false;

// 로그 확인용
if (__DEV__) {
  console.log(`[DM Service] Mode: ${USE_DM_MOCK ? "MOCK (Fake Data)" : "REMOTE (Real Server)"}`);
}

const dmService = USE_DM_MOCK ? dmLocalService : dmRemoteService;

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