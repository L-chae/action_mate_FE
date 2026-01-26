// src/features/meetings/api/meetingApi.ts
import { meetingApiLocal } from "./meetingApi.local";
import { meetingApiRemote } from "./meetingApi.remote";
import type { MeetingApi } from "../model/types";

/**
 * ✅ Meeting API Facade
 *
 * [수정됨] 404 에러 해결을 위해 강제로 Mock 모드를 켭니다.
 * 서버 연결 준비가 완료되면 USE_MOCK = false 로 변경하세요.
 */

// ---------------------------------------------------------------------
// 🚨 [긴급 수정] 환경변수 로직 잠시 무시 -> 강제 Mock 사용
// ---------------------------------------------------------------------

// const ENV_USE_MOCK = String(process.env.EXPO_PUBLIC_USE_MOCK ?? "").trim().toLowerCase();
// const isMockForced = ENV_USE_MOCK === "true" || ENV_USE_MOCK === "1";
// const isRemoteForced = ENV_USE_MOCK === "false" || ENV_USE_MOCK === "0";
// const USE_MOCK = __DEV__ ? (isRemoteForced ? false : true) : false;

// 👇 지금은 무조건 true로 설정하여 404 에러를 방지합니다.
const USE_MOCK = false; 

export const meetingApi: MeetingApi = USE_MOCK ? meetingApiLocal : meetingApiRemote;
export const __MEETING_API_MODE__ = USE_MOCK ? "mock" : "remote";

// 콘솔에 현재 모드를 출력하여 개발자가 인지할 수 있게 함
if (__DEV__) {
  console.log(`[Meeting API] Current Mode: ${__MEETING_API_MODE__.toUpperCase()}`);
}