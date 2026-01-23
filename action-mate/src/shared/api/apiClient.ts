// src/shared/api/apiClient.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getAccessToken, clearAuthTokens } from "@/shared/api/authToken";

// ------------------------------
// ✅ 1. 기본 설정
// ------------------------------
// 실제 사용할 API 주소로 변경해주세요
export const API_BASE_URL = "https://bold-seal-only.ngrok-free.app/api";

export const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
  timeout: 30000,
});

// ------------------------------
// ✅ 2. Request Interceptor: 토큰 자동 부착
// ------------------------------
client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  
  if (token) {
    config.headers = config.headers ?? {};
    // Authorization: Bearer {토큰}
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ------------------------------
// ✅ 3. Response Interceptor: 응답/에러 처리
// ------------------------------
client.interceptors.response.use(
  (res) => res, // 성공 시 그대로 반환
  async (error: AxiosError) => {
    // 인증 에러 (401) 발생 시 처리
    if (error.response?.status === 401) {
      console.log("🚨 토큰 만료 또는 인증 실패 (로그아웃 처리)");
      await clearAuthTokens();
      // 필요 시 강제 리다이렉트 로직 추가 가능 (예: router.replace('/login'))
    }
    return Promise.reject(error);
  }
);

// endpoints는 별도 파일(endpoints.ts)에서 관리하는 것을 권장하지만,
// 편의를 위해 여기서 바로 export 해서 사용해도 됩니다.
// (위에 작성해드린 endpoints.ts 내용을 사용하세요)
export { endpoints } from "./endpoints";