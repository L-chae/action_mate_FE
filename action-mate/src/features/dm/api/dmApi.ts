import { dmLocalService } from "./dmApi.local";
import { dmRemoteService } from "./dmApi.remote";
import type { DMMessage, DMThread } from "../model/types";

/**
 * ⚙️ 환경 설정
 * - true: 로컬 Mock 데이터 사용 (개발 중, 서버 없을 때)
 * - false: 실제 서버 API 사용
 */
const USE_MOCK = true; 

// ✅ 현재 모드에 맞는 서비스 선택
const dmService = USE_MOCK ? dmLocalService : dmRemoteService;

/**
 * ✅ Public Interface
 * UI는 아래 함수들만 import 해서 사용합니다. (내부 구현이 local인지 remote인지 몰라도 됨)
 */

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