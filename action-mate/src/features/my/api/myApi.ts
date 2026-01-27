// src/features/my/api/myApi.ts
import myApiLocal from "./myApi.local";
import myApiRemote from "./myApi.remote";
import { USE_MOCK_AUTH } from "@/features/auth/api/authApi";

/**
 * My 도메인도 Auth와 동일한 mock 플래그를 공유해 환경별 동작 불일치를 방지합니다.
 */
export const myApi = USE_MOCK_AUTH ? myApiLocal : myApiRemote;
export default myApi;

/**
 * 3줄 요약
 * - Auth와 동일한 USE_MOCK_AUTH를 사용해 my 도메인도 같은 환경 기준으로 local/remote를 선택합니다.
 * - 별도 플래그 중복을 제거해 “Auth는 mock인데 My는 remote” 같은 꼬임을 방지합니다.
 * - 호출부 변경 없이 import만 유지하면 됩니다.
 */