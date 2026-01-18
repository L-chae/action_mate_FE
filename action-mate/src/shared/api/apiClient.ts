import axios from "axios";

// ✅ 백엔드 API 기본 주소 (나중에 .env로 빼셔도 됩니다)
export const API_BASE_URL = "http://localhost:3000/api";

/**
 * ✅ 전역 Axios 인스턴스
 * - export const client 형식으로 내보내야 다른 곳에서 { client } 로 import 가능합니다.
 */
export const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 5000,
});

// (옵션) 요청/응답 인터셉터 설정 가능
client.interceptors.request.use(async (config) => {
  // 예: 토큰이 있다면 헤더에 추가
  // const token = await getToken();
  // if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});