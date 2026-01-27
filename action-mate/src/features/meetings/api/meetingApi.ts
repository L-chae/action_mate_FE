// src/features/meetings/api/meetingApi.ts
import { meetingApiLocal } from "./meetingApi.local";
import { meetingApiRemote } from "./meetingApi.remote";
import type { MeetingApi } from "../model/types";

/**
 * ✅ Meeting API Facade
 * - dev 기본값은 MOCK(백엔드 준비 전 UI/UX 안정)
 * - env로 remote 강제 가능: EXPO_PUBLIC_USE_MOCK=false (또는 0)
 */

const ENV_USE_MOCK = String(process.env.EXPO_PUBLIC_USE_MOCK ?? "").trim().toLowerCase();
const isMockForced = ENV_USE_MOCK === "true" || ENV_USE_MOCK === "1";
const isRemoteForced = ENV_USE_MOCK === "false" || ENV_USE_MOCK === "0";

// dev: 기본 mock, 명시적으로 remote를 강제하면 remote
// prod: 기본 remote
const USE_MOCK = __DEV__ ? (isRemoteForced ? false : isMockForced ? true : true) : false;

export const meetingApi: MeetingApi = USE_MOCK ? meetingApiLocal : meetingApiRemote;
export const __MEETING_API_MODE__ = USE_MOCK ? "mock" : "remote";

if (__DEV__) {
  console.log(`[Meeting API] Current Mode: ${__MEETING_API_MODE__.toUpperCase()}`);
}

export default meetingApi;