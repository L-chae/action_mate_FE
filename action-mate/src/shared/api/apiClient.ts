// src/shared/api/apiClient.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearAuthTokens } from "@/shared/api/authToken";

// ✅ 백엔드 API 기본 주소 (나중에 .env로 빼도 됨)
export const API_BASE_URL = "https://bold-seal-only.ngrok-free.app/api";

export const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
  timeout: 10000,
});

// ------------------------------
// ✅ Request: accessToken 붙이기
// ------------------------------
client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// -------------------------------------------------------
// ✅ Response: 401/403이면 refresh 시도 후 1회 재시도
// -------------------------------------------------------
let isRefreshing = false;
let waitQueue: Array<(token: string | null) => void> = [];

function notifyQueue(token: string | null) {
  waitQueue.forEach((cb) => cb(token));
  waitQueue = [];
}

async function refreshTokens(): Promise<{ accessToken: string; refreshToken?: string } | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  // 서버 명세: /auth/refresh (POST)
  // ⚠️ 실제 서버가 refreshToken을 어디로 받는지에 따라 수정 필요:
  // - body에 넣는 방식 / header에 넣는 방식 / cookie 방식 등
  // 우선 가장 흔한 body 방식으로 구현
  const res = await axios.post(
    `${API_BASE_URL}/auth/refresh`,
    { refreshToken },
    {
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      timeout: 10000,
    }
  );

  const data = res.data as { accessToken: string; refreshToken?: string };
  if (!data?.accessToken) return null;
  return data;
}

client.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    // ✅ 재시도는 1번만
    if (!original || original._retry) {
      return Promise.reject(error);
    }

    // 서버가 403으로 떨어지는 경우도 "토큰 만료/미부착"일 수 있어서 401/403 둘 다 처리
    if (status !== 401 && status !== 403) {
      return Promise.reject(error);
    }

    original._retry = true;

    // 이미 refresh 중이면 큐에 대기
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        waitQueue.push((token) => {
          if (!token) {
            reject(error);
            return;
          }
          original.headers = original.headers ?? {};
          original.headers.Authorization = `Bearer ${token}`;
          resolve(client(original));
        });
      });
    }

    isRefreshing = true;

    try {
      const tokens = await refreshTokens();
      if (!tokens) {
        await clearAuthTokens();
        notifyQueue(null);
        return Promise.reject(error);
      }

      await setAccessToken(tokens.accessToken);
      if (tokens.refreshToken) await setRefreshToken(tokens.refreshToken);

      notifyQueue(tokens.accessToken);

      original.headers = original.headers ?? {};
      original.headers.Authorization = `Bearer ${tokens.accessToken}`;
      return client(original);
    } catch (e) {
      await clearAuthTokens();
      notifyQueue(null);
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);