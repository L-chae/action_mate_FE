// src/shared/api/client.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getAccessToken, clearAuthTokens } from "@/shared/api/authToken";

export const API_BASE_URL = "https://bold-seal-only.ngrok-free.app/api";

// 서버에서 요구하는 커스텀 헤더 키
const ACCESS_TOKEN_HEADER_KEY = "X-AUTH-TOKEN";

function isPublicRequest(config: InternalAxiosRequestConfig) {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";

  if (method === "post" && url === "/auth/login") return true;
  if (method === "post" && url === "/users") return true;

  // 필요 시 추가
  // if (method === "get" && url === "/health") return true;

  return false;
}

export const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
  timeout: 10000,
});

client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  if (isPublicRequest(config)) return config;

  const token = await getAccessToken();
  if (!token) return config;

  // 토큰 문자열에 혹시 Bearer가 이미 들어있으면 제거한 순수 토큰도 확보
  const raw = token.startsWith("Bearer ") ? token.slice("Bearer ".length) : token;
  const bearer = `Bearer ${raw}`;

  config.headers = {
    ...(config.headers as any),

    // ✅ 표준: Bearer
    Authorization: bearer,

    // ✅ 커스텀: 서버가 raw를 기대하는 케이스가 많음
    [ACCESS_TOKEN_HEADER_KEY]: raw,
  };

  if (__DEV__) {
    const url = config.url ?? "";
    if (url.includes("/profile") || url.includes("/meetings")) {
      console.log("[REQ]", config.method, config.url, {
        Authorization: (config.headers as any)?.Authorization,
        [ACCESS_TOKEN_HEADER_KEY]: (config.headers as any)?.[ACCESS_TOKEN_HEADER_KEY],
      });
    }
  }

  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      // 서버가 403을 “토큰 문제”로도 쓰는 경우가 있어서 일단 정리
      await clearAuthTokens();
    }
    return Promise.reject(error);
  }
);