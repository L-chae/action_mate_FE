// src/shared/api/apiClient.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { getAccessToken, clearAuthTokens } from "@/shared/api/authToken";

// ------------------------------
// ✅ 1. 기본 설정
// ------------------------------
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
// ✅ 2. Request: 요청 보낼 때 '출입증(Token)' 자동 부착
// ------------------------------
client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  
  if (token) {
    config.headers = config.headers ?? {};
    // Authorization: Bearer {토큰} 형식으로 서버에 보냄
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ------------------------------
// ✅ 3. Response: 응답 처리 (단순화 버전)
// ------------------------------
client.interceptors.response.use(
  // 성공하면 데이터 그대로 반환
  (res) => res,
  
  // 에러 나면 여기서 처리
  async (error: AxiosError) => {
    // 혹~시나 2주가 지나서 401(인증 만료)이 뜨면?
    if (error.response?.status === 401) {
      console.log("🚨 토큰 만료됨 (로그아웃 처리)");
      // 기기에 저장된 토큰 삭제하고 로그아웃 시킴
      await clearAuthTokens();
      // 필요시: window.location.href = "/login" 또는 router 이동 처리
    }
    
    // 그 외 에러는 화면에서 처리하도록 그대로 넘김
    return Promise.reject(error);
  }
);

// ------------------------------
// ✅ 4. API 주소 목록 (Endpoints)
// ------------------------------
export const endpoints = {
  auth: {
    login: "/auth/login",
    logout: "/auth/logout",
    // refresh는 지금 필요 없어서 뺌 (나중에 필요하면 추가)
  },
  users: {
    signup: "/users",
    exists: (loginId: string) =>
      `/users/exists?loginId=${encodeURIComponent(loginId)}`,
    profile: (userId: string) => `/users/${encodeURIComponent(userId)}/profile`,
  },
  posts: {
    create: "/posts",
    byId: (postId: number | string) => `/posts/id/${postId}`,
    byCategory: (category: string) =>
      `/posts/category/${encodeURIComponent(category)}`,
    nearby: "/posts/nearby",
    applicants: (postId: number | string) => `/posts/${postId}/applicants`,
    decideApplicant: (postId: number | string, userId: string) =>
      `/posts/${postId}/applicants/${encodeURIComponent(userId)}`,
    ratings: (postId: number | string) => `/posts/${postId}/ratings`,
  },
  message: {
    rooms: "/message/room",
    room: (roomId: number | string) => `/message/room/${roomId}`,
    send: "/message",
  },
  reports: {
    create: "/reports",
  },
} as const;
