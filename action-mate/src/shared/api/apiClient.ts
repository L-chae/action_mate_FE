// src/shared/api/apiClient.ts
import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from "@/shared/api/authToken";
import { endpoints } from "./endpoints";

// ------------------------------
// ✅ 1. 기본 설정
// ------------------------------
// 실제 사용할 API 주소로 변경하세요.
// - endpoints는 "/auth/login" 처럼 "/api" 이후 경로만 가지므로 baseURL에 "/api"까지 포함합니다.
export const API_BASE_URL = "https://bold-seal-only.ngrok-free.app/api";

export const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
  timeout: 30_000,
});

// refresh 전용(인터셉터 미적용) 클라이언트
const refreshClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
  timeout: 30_000,
});

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

// ------------------------------
// ✅ 2. Request Interceptor: Access Token 자동 부착
// ------------------------------
client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();

  if (token) {
    // axios v1에서 headers 타입이 까다로워 any로 안전하게 처리
    (config.headers as any) = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }

  return config;
});

// ------------------------------
// ✅ 3. Response Interceptor: 401 시 토큰 갱신 후 1회 재시도
// ------------------------------
// 동시에 여러 요청이 401을 맞으면 refresh를 1번만 수행하도록 락
let refreshPromise: Promise<{ accessToken: string; refreshToken: string } | null> | null = null;

async function refreshTokens(): Promise<{ accessToken: string; refreshToken: string } | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  // OpenAPI 명세에 refresh 요청 바디가 명확히 없지만,
  // 실서비스에서 흔히 body/header 둘 중 하나를 쓰므로 둘 다 보내 호환성을 높입니다.
  const res = await refreshClient.post(endpoints.auth.refresh, { refreshToken }, {
    headers: { Authorization: `Bearer ${refreshToken}` },
  });

  const data = res.data as { accessToken?: string; refreshToken?: string };
  const newAccess = data?.accessToken;
  const newRefresh = data?.refreshToken;

  if (!newAccess || !newRefresh) return null;

  await Promise.all([setAccessToken(newAccess), setRefreshToken(newRefresh)]);
  return { accessToken: newAccess, refreshToken: newRefresh };
}

client.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const originalConfig = error.config as RetriableRequestConfig | undefined;

    // 인증 실패(401): refresh 후 원요청 1회 재시도
    if (status === 401 && originalConfig && !originalConfig._retry) {
      originalConfig._retry = true;

      try {
        refreshPromise = refreshPromise ?? refreshTokens();
        const tokens = await refreshPromise;
        refreshPromise = null;

        if (!tokens) {
          await clearAuthTokens();
          return Promise.reject(error);
        }

        // 재시도 시 새 access token 주입
        (originalConfig.headers as any) = originalConfig.headers ?? {};
        (originalConfig.headers as any).Authorization = `Bearer ${tokens.accessToken}`;

        return client.request(originalConfig);
      } catch (e) {
        refreshPromise = null;
        await clearAuthTokens();
        return Promise.reject(e);
      }
    }

    // 그 외: 그대로 throw
    return Promise.reject(error);
  }
);

export { endpoints };