// src/features/auth/api/authApi.ts
import type { AuthApi } from "@/features/auth/model/types";
import LocalApi from "./authApi.local";
import RemoteApi from "./authApi.remote";

/**
 * Mock/Remote 선택은 한 곳에서만 관리합니다.
 * - Store/화면에서 또 다른 USE_MOCK 플래그를 만들면 환경별 동작 불일치가 쉽게 생깁니다.
 */
export const USE_MOCK_AUTH: boolean = __DEV__ && process.env.EXPO_PUBLIC_USE_MOCK === "true";

/**
 * 개발 편의: 세션이 없을 때 mock 자동 로그인
 * - 필요할 때만 켜도록 별도 플래그로 분리
 */
export const USE_MOCK_AUTO_LOGIN: boolean =
  USE_MOCK_AUTH && process.env.EXPO_PUBLIC_MOCK_AUTO_LOGIN === "true";

export const MOCK_AUTO_LOGIN_CREDENTIALS = {
  loginId: process.env.EXPO_PUBLIC_MOCK_LOGIN_ID ?? "user01",
  password: process.env.EXPO_PUBLIC_MOCK_PASSWORD ?? "1234",
} as const;

// 선택된 구현체
export const authApi: AuthApi = USE_MOCK_AUTH ? LocalApi : RemoteApi;
export default authApi;

/**
 * 3줄 요약
 * - 구현체 선택 로직은 유지하고, local/remote가 동일 세션 저장소(authToken.ts)를 쓰도록 맞춘 상태로 사용합니다.
 * - mock 자동로그인 플래그는 USE_MOCK_AUTH일 때만 동작하도록 유지했습니다.
 * - 나머지 호출부 변경 없이 authApi만 교체해도 동작하도록 인터페이스를 고정했습니다.
 */