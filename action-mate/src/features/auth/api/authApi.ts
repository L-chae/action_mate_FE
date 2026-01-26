// src/features/auth/api/authApi.ts
import type { AuthApi } from "@/features/auth/model/types";
import LocalApi from "./authApi.local";
import RemoteApi from "./authApi.remote";

function parseEnvBoolean(v: unknown): boolean {
  if (typeof v !== "string") return false;
  const s = v.trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes" || s === "y";
}

/**
 * Mock/Remote 선택은 한 곳에서만 관리합니다.
 * - Store/화면에서 또 다른 USE_MOCK 플래그를 만들면 "환경별 동작 불일치"가 쉽게 생깁니다.
 */
export const USE_MOCK_AUTH: boolean = __DEV__ && parseEnvBoolean(process.env.EXPO_PUBLIC_USE_MOCK);

/**
 * 개발 편의: 세션이 없을 때 mock 자동 로그인
 * - 필요할 때만 켜도록 별도 플래그로 분리
 */
export const USE_MOCK_AUTO_LOGIN: boolean = USE_MOCK_AUTH && parseEnvBoolean(process.env.EXPO_PUBLIC_MOCK_AUTO_LOGIN);

export const MOCK_AUTO_LOGIN_CREDENTIALS = {
  loginId: process.env.EXPO_PUBLIC_MOCK_LOGIN_ID ?? "user01",
  password: process.env.EXPO_PUBLIC_MOCK_PASSWORD ?? "1234",
} as const;

// 선택된 구현체
export const authApi: AuthApi = USE_MOCK_AUTH ? LocalApi : RemoteApi;
export default authApi;

// 요약: 1) EXPO_PUBLIC_USE_MOCK 값을 엄격 파싱해 의도치 않은 mock 고정을 줄였습니다.
// 요약: 2) mock/remote 선택 로직은 이 파일 한 곳에서만 유지합니다.
// 요약: 3) 나머지 코드는 기존 export 형태를 유지합니다.