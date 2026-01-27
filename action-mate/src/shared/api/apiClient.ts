// src/shared/api/apiClient.ts
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import {
  clearAuthTokens,
  clearCurrentUserId,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from "@/shared/api/authToken";
import { endpoints } from "./endpoints";

// ------------------------------
// ✅ 1) 기본 설정
// ------------------------------
function normalizeBaseUrl(raw: string): string {
  const trimmed = String(raw ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) return "https://bold-seal-only.ngrok-free.app/api";
  if (trimmed.toLowerCase().endsWith("/api")) return trimmed;
  return `${trimmed}/api`;
}

export const API_BASE_URL = normalizeBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://bold-seal-only.ngrok-free.app/api"
);

const COMMON_HEADERS = {
  Accept: "application/json",
  "ngrok-skip-browser-warning": "true",
} as const;

export const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { ...COMMON_HEADERS },
  timeout: 30_000,
});

// refresh 전용(인터셉터 미적용) 클라이언트
const refreshClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { ...COMMON_HEADERS },
  timeout: 30_000,
});

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type Tokens = { accessToken: string; refreshToken: string };

// ------------------------------
// ✅ 2) 유틸
// ------------------------------
function normalizePathOnly(url?: string): string {
  if (!url) return "";
  const raw = String(url).trim();
  const lower = raw.toLowerCase();

  // absolute url
  if (lower.startsWith("http://") || lower.startsWith("https://")) {
    try {
      return new URL(raw).pathname.toLowerCase();
    } catch {
      // fallthrough
    }
  }

  // relative url: "/path?x=1" 또는 "path?x=1"
  const ensured = lower.startsWith("/") ? lower : `/${lower}`;
  return ensured.split("?")[0] ?? "";
}

// 왜 제외 리스트가 필요?
// - 로그인/리프레시는 401이 나도 “refresh로 해결”할 수 없는 요청이므로 재시도 로직이 개입하면 복잡해짐
function isAuthExcludedEndpoint(url?: string): boolean {
  const path = normalizePathOnly(url);
  if (!path) return false;

  const loginPath = String(endpoints.auth.login).toLowerCase();
  const refreshPath = String(endpoints.auth.refresh).toLowerCase();
  const logoutPath = String(endpoints.auth.logout).toLowerCase();
  const signupPath = String(endpoints.users.signup).toLowerCase();

  // 함수형 endpoint는 고정 path로 비교
  const usersExistsPath = "/users/exists";

  return (
    path === loginPath ||
    path === refreshPath ||
    path === logoutPath ||
    path === signupPath ||
    path === usersExistsPath
  );
}

async function clearSession(): Promise<void> {
  // 토큰만 지우면 하이드레이트/스토어가 currentUserId로 “로그인”이라 착각할 수 있음
  await Promise.allSettled([clearCurrentUserId(), clearAuthTokens()]);
}

// ------------------------------
// ✅ 3) Request Interceptor: Access Token 자동 부착
// ------------------------------
client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (!token) return config;

  const headers: any = (config.headers as any) ?? {};
  if (!headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }
  config.headers = headers;

  return config;
});

// ------------------------------
// ✅ 4) Response Interceptor: 401 시 refresh 후 1회 재시도
// ------------------------------
// 동시에 여러 요청이 401을 맞으면 refresh를 1번만 수행하도록 single-flight
let refreshPromise: Promise<Tokens | null> | null = null;

async function refreshTokensOnce(): Promise<Tokens | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return null;

      // ✅ 명세상 /auth/refresh 는 requestBody가 정의되어 있지 않으므로 "헤더만" 먼저 시도
      try {
        const res = await refreshClient.post(
          endpoints.auth.refresh,
          null,
          { headers: { Authorization: `Bearer ${refreshToken}` } }
        );

        const data = (res?.data ?? {}) as { accessToken?: string; refreshToken?: string };
        const newAccess = data?.accessToken;
        const newRefresh = data?.refreshToken;

        if (!newAccess || !newRefresh) return null;

        await Promise.all([setAccessToken(newAccess), setRefreshToken(newRefresh)]);
        return { accessToken: newAccess, refreshToken: newRefresh };
      } catch (e) {
        // 서버 구현이 body를 요구하는 경우(명세와 다르더라도) 1회 fallback
        if (!axios.isAxiosError(e)) return null;

        const status = e.response?.status;
        const shouldFallback = status === 400 || status === 415;

        if (!shouldFallback) return null;

        const res = await refreshClient.post(
          endpoints.auth.refresh,
          { refreshToken },
          { headers: { Authorization: `Bearer ${refreshToken}` } }
        );

        const data = (res?.data ?? {}) as { accessToken?: string; refreshToken?: string };
        const newAccess = data?.accessToken;
        const newRefresh = data?.refreshToken;

        if (!newAccess || !newRefresh) return null;

        await Promise.all([setAccessToken(newAccess), setRefreshToken(newRefresh)]);
        return { accessToken: newAccess, refreshToken: newRefresh };
      }
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

client.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalConfig = error.config as RetriableRequestConfig | undefined;

    if (!originalConfig) return Promise.reject(error);

    // login/refresh/logout/users/exists 같은 요청은 refresh 재시도 로직에서 제외
    if (isAuthExcludedEndpoint(originalConfig.url)) {
      return Promise.reject(error);
    }

    // 인증 실패(401): refresh 후 원요청 1회 재시도
    if (status === 401 && !originalConfig._retry) {
      originalConfig._retry = true;

      const tokens = await refreshTokensOnce();
      if (!tokens) {
        await clearSession();
        return Promise.reject(error);
      }

      const headers: any = (originalConfig.headers as any) ?? {};
      headers.Authorization = `Bearer ${tokens.accessToken}`;
      originalConfig.headers = headers;

      return client.request(originalConfig);
    }

    // 재시도까지 했는데 또 401이면 세션 무효
    if (status === 401 && originalConfig._retry) {
      await clearSession();
    }

    return Promise.reject(error);
  }
);
console.log("🚀 현재 API 연결 주소:", API_BASE_URL);
export { endpoints };
export default client;


// 3줄 요약
// - /auth/refresh는 명세에 맞춰 "헤더만" 먼저 호출하고, 서버가 body를 요구할 때만 1회 fallback 합니다.
// - signup 경로는 /users 이므로 제외 리스트를 /users/signup → /users 로 바로잡고, /users/exists도 제외 처리했습니다.
// - path 비교를 query 제거한 pathname 기준으로 정규화해, 상대/절대 URL 및 쿼리 포함 케이스에서 오작동을 줄였습니다.