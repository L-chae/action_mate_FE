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
// 왜 env로?
// - 빌드/배포 환경(dev/stg/prod)마다 URL이 달라져도 코드 수정 없이 대응 가능
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://unannexable-blusterously-tandy.ngrok-free.dev/api";

const COMMON_HEADERS = {
  "Content-Type": "application/json",
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
function isAxiosError(e: unknown): e is AxiosError {
  return axios.isAxiosError(e);
}

// 왜 제외 리스트가 필요?
// - 로그인/리프레시는 401이 나도 “refresh로 해결”할 수 없는 요청이므로 재시도 로직이 개입하면 복잡해짐
function isAuthExcludedEndpoint(url?: string): boolean {
  if (!url) return false;

  // Axios는 보통 상대경로("/auth/login")가 들어오지만, 혹시 몰라 전체 URL도 같이 처리
  const u = url.toLowerCase();

  // endpoints 기반(가능하면 이 값을 우선)
  const login = String(endpoints.auth.login).toLowerCase();
  const refresh = String(endpoints.auth.refresh).toLowerCase();
  const logout = String(endpoints.auth.logout).toLowerCase();
  const signup = String(endpoints.users.signup).toLowerCase();

  if (u.includes(login) || u.includes(refresh) || u.includes(logout) || u.includes(signup)) {
    return true;
  }

  // 안전망(서버 경로가 바뀌거나 endpoints가 다를 때 최소한의 방어)
  if (u.includes("/auth/login") || u.includes("/auth/refresh") || u.includes("/auth/logout")) {
    return true;
  }
  if (u.includes("/users/signup")) {
    return true;
  }

  return false;
}

async function clearSession(): Promise<void> {
  // 왜 둘 다?
  // - 토큰만 지우면 하이드레이트/스토어가 currentUserId로 “로그인”이라 착각할 수 있음
  await Promise.allSettled([clearCurrentUserId(), clearAuthTokens()]);
}

// ------------------------------
// ✅ 3) Request Interceptor: Access Token 자동 부착
// ------------------------------
client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (!token) return config;

  // 이미 Authorization이 명시된 요청(특수 케이스)에는 덮어쓰지 않음
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

      // 서버 구현이 body/header 중 하나만 받는 경우가 있어 둘 다 보내 호환성 ↑
      const res = await refreshClient.post(
        endpoints.auth.refresh,
        { refreshToken },
        { headers: { Authorization: `Bearer ${refreshToken}` } }
      );

      const data = res.data as { accessToken?: string; refreshToken?: string };
      const newAccess = data?.accessToken;
      const newRefresh = data?.refreshToken;

      if (!newAccess || !newRefresh) return null;

      await Promise.all([setAccessToken(newAccess), setRefreshToken(newRefresh)]);
      return { accessToken: newAccess, refreshToken: newRefresh };
    } catch {
      return null;
    } finally {
      // 왜 finally?
      // - refresh 중 에러가 나도 lock이 풀리지 않으면 이후 요청이 영원히 대기/오작동할 수 있음
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

    // 네트워크/타임아웃 등은 여기서 굳이 건드리지 않음
    if (!originalConfig) return Promise.reject(error);

    // login/refresh/logout/signup 같은 요청은 refresh 재시도 로직에서 제외
    if (isAuthExcludedEndpoint(originalConfig.url)) {
      return Promise.reject(error);
    }

    // 인증 실패(401): refresh 후 원요청 1회 재시도
    if (status === 401 && !originalConfig._retry) {
      originalConfig._retry = true;

      const tokens = await refreshTokensOnce();

      if (!tokens) {
        // refresh 실패 = 세션 무효화
        await clearSession();
        return Promise.reject(error);
      }

      // 재시도 시 새 access token 주입
      const headers: any = (originalConfig.headers as any) ?? {};
      headers.Authorization = `Bearer ${tokens.accessToken}`;
      originalConfig.headers = headers;

      return client.request(originalConfig);
    }

    // 이미 재시도까지 했는데 또 401이면 세션이 완전히 무효(계정 삭제/권한 변경 등)일 확률이 큼
    if (status === 401 && originalConfig._retry) {
      await clearSession();
    }

    return Promise.reject(error);
  }
);

export { endpoints };
export default client;