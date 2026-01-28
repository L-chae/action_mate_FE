// src/shared/api/apiClient.ts
import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
  AxiosHeaders,
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
  const trimmed = String(raw ?? "")
    .trim()
    .replace(/\/+$/, "");
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

function safeJsonParseOrText(input: unknown): unknown {
  if (input === undefined || input === null) return null;
  if (typeof input !== "string") return input;

  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    // JSON parse 성공 시: object/array/boolean/string 모두 허용
    return JSON.parse(trimmed);
  } catch {
    // 실패 시: text(string)
    return input;
  }
}

function normalizePathOnly(url?: string): string {
  if (!url) return "";
  const raw = String(url ?? "").trim();
  if (!raw) return "";

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
  return (ensured.split("?")[0] ?? "").toLowerCase();
}

export type ErrorResponse = { code: string; message: string };
export type NormalizedApiError = {
  status: number | null;
  code?: string;
  message: string;
  raw?: unknown;
  url?: string;
  method?: string;
};

function isErrorResponseBody(body: unknown): body is ErrorResponse {
  if (!body || typeof body !== "object") return false;
  const anyBody = body as any;
  return typeof anyBody?.code === "string" && typeof anyBody?.message === "string";
}

function extractErrorMessageFromSpringDefault(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const anyBody = body as any;

  const messageCandidates = [
    anyBody?.message,
    anyBody?.error,
    anyBody?.detail,
    anyBody?.title,
    anyBody?.reason,
  ].filter((v) => typeof v === "string" && String(v).trim().length > 0) as string[];

  if (messageCandidates.length > 0) return messageCandidates[0]!.trim();
  return null;
}

export function normalizeApiError(err: unknown): NormalizedApiError {
  const fallback: NormalizedApiError = {
    status: null,
    message: "요청에 실패했습니다.",
    raw: err,
  };

  if (!axios.isAxiosError(err)) return fallback;

  const ax = err as AxiosError;
  const status = ax.response?.status ?? null;
  const url = ax.config?.url ? String(ax.config.url) : undefined;
  const method = ax.config?.method ? String(ax.config.method).toUpperCase() : undefined;

  const rawBody = ax.response?.data;
  const body = safeJsonParseOrText(rawBody);

  if (typeof body === "string" && body.trim()) {
    return { status, message: body.trim(), raw: body, url, method };
  }

  if (isErrorResponseBody(body)) {
    return { status, code: body.code, message: body.message, raw: body, url, method };
  }

  const springMsg = extractErrorMessageFromSpringDefault(body);
  if (springMsg) {
    return { status, message: springMsg, raw: body, url, method };
  }

  if (body !== null && body !== undefined) {
    try {
      const asString = typeof body === "string" ? body : JSON.stringify(body);
      if (asString && String(asString).trim()) {
        return { status, message: String(asString).trim(), raw: body, url, method };
      }
    } catch {
      // ignore
    }
  }

  const generic = status ? `HTTP ${status}` : "요청에 실패했습니다.";
  return { status, message: generic, raw: body, url, method };
}

function attachNormalizedError(axErr: AxiosError): void {
  try {
    const normalized = normalizeApiError(axErr);
    (axErr as any).normalized = normalized;
  } catch {
    // no-op (방어)
  }
}

function toHeadersObject(headers: unknown): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof AxiosHeaders) return headers.toJSON() as Record<string, string>;
  if (typeof headers === "object") return headers as Record<string, string>;
  return {};
}

// ------------------------------
// ✅ 2) 인증 제외(permitAll) & refresh 제외
// ------------------------------
// 왜 제외 리스트가 필요?
// - 로그인/회원가입/중복체크/이미지(permitAll)는 401이 나도 “refresh로 해결”할 수 없는 요청이므로 재시도 로직을 빼야 안전
// - refresh는 accessToken 주입/재시도 로직에서 제외 (refreshToken으로만 인증)
function isPermitAllEndpoint(url?: string): boolean {
  const path = normalizePathOnly(url);
  if (!path) return false;

  const loginPath = String(endpoints.auth.login ?? "").toLowerCase();
  const signupPath = String(endpoints.users.signup ?? "").toLowerCase();
  const refreshPath = String(endpoints.auth.refresh ?? "").toLowerCase();

  // 함수형 endpoint는 path-only로 비교
  const usersExistsPath = "/users/exists";

  // /api/images/** permitAll
  const imagesRoot = "/images";

  return (
    path === loginPath ||
    path === signupPath ||
    path === refreshPath ||
    path === usersExistsPath ||
    path.startsWith(imagesRoot)
  );
}

function isRefreshEndpoint(url?: string): boolean {
  const path = normalizePathOnly(url);
  const refreshPath = String(endpoints.auth.refresh ?? "").toLowerCase();
  return !!path && path === refreshPath;
}

// ------------------------------
// ✅ 3) Raw JSON string body 강제(실수 방지)
// ------------------------------
function isDecideApplicantEndpoint(method?: string, url?: string): boolean {
  const m = String(method ?? "").toLowerCase();
  if (m !== "patch") return false;
  const path = normalizePathOnly(url);
  // /posts/{postId}/applicants/{userId}
  return /^\/posts\/[^/]+\/applicants\/[^/]+$/.test(path);
}

function isSendRoomMessageEndpoint(method?: string, url?: string): boolean {
  const m = String(method ?? "").toLowerCase();
  if (m !== "post") return false;
  const path = normalizePathOnly(url);
  // /message/room/{roomId}
  return /^\/message\/room\/[^/]+$/.test(path);
}

function ensureJsonStringBody(
  data: unknown,
  kind: "APPLICANT_DECIDE" | "MESSAGE_SEND"
): string | null {
  // 이미 JSON string 형태("...")면 그대로
  if (typeof data === "string") {
    const t = data.trim();
    if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) return t;
    // 일반 string이면 JSON string으로 래핑
    return JSON.stringify(data);
  }

  // 흔한 실수 케이스 보정: { state: "MEMBER" } / { content: "hi" }
  if (data && typeof data === "object") {
    const anyData = data as any;

    if (kind === "APPLICANT_DECIDE" && typeof anyData?.state === "string") {
      return JSON.stringify(anyData.state);
    }

    if (kind === "MESSAGE_SEND" && typeof anyData?.content === "string") {
      return JSON.stringify(anyData.content);
    }
  }

  return null;
}

function validateApplicantDecideValue(value: string): boolean {
  return value === "MEMBER" || value === "REJECTED";
}

function forceContentTypeJson(headers: Record<string, string>): Record<string, string> {
  const next = { ...headers };
  const hasCt = Object.keys(next).some((k) => k.toLowerCase() === "content-type");
  if (!hasCt) next["Content-Type"] = "application/json";
  return next;
}

// ------------------------------
// ✅ 4) axios 인스턴스
// ------------------------------
export const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { ...COMMON_HEADERS },
  timeout: 30_000,
  responseType: "text", // D-1: Content-Type과 무관하게 text로 받고 직접 파싱
  transformResponse: [(data) => safeJsonParseOrText(data)],
});

// refresh 전용(인터셉터 미적용) 클라이언트
const refreshClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { ...COMMON_HEADERS },
  timeout: 30_000,
  responseType: "text",
  transformResponse: [(data) => safeJsonParseOrText(data)],
});

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type Tokens = { accessToken: string; refreshToken: string };

async function clearSession(): Promise<void> {
  // 토큰만 지우면 하이드레이트/스토어가 currentUserId로 “로그인”이라 착각할 수 있음
  await Promise.allSettled([clearCurrentUserId(), clearAuthTokens()]);
}

// ------------------------------
// ✅ 5) Request Interceptor: Access Token 자동 부착 + JSON string body 강제
// ------------------------------
client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const url = config?.url;
  const method = config?.method;

  // (1) permitAll / refresh에는 accessToken 주입하지 않음
  const shouldSkipAccessAttach = isPermitAllEndpoint(url) || isRefreshEndpoint(url);

  if (!shouldSkipAccessAttach) {
    const token = await getAccessToken();
    if (token) {
      const headersObj = toHeadersObject(config.headers);
      if (!headersObj.Authorization) {
        headersObj.Authorization = `Bearer ${token}`;
      }
      config.headers = headersObj as any;
    }
  }

  // (2) 실수 방지: 특정 endpoint는 raw JSON string body 강제
  if (isDecideApplicantEndpoint(method, url)) {
    const coerced = ensureJsonStringBody(config.data, "APPLICANT_DECIDE");
    if (coerced !== null) {
      const unwrapped = (() => {
        try {
          return JSON.parse(coerced);
        } catch {
          return null;
        }
      })();

      // body 값 검증(허용: MEMBER / REJECTED)
      if (typeof unwrapped === "string" && !validateApplicantDecideValue(unwrapped)) {
        throw new Error(`Applicant decide body must be "MEMBER" or "REJECTED" (got: ${unwrapped})`);
      }

      const headersObj = forceContentTypeJson(toHeadersObject(config.headers));
      config.headers = headersObj as any;
      config.data = coerced;
    }
  }

  if (isSendRoomMessageEndpoint(method, url)) {
    const coerced = ensureJsonStringBody(config.data, "MESSAGE_SEND");
    if (coerced !== null) {
      const headersObj = forceContentTypeJson(toHeadersObject(config.headers));
      config.headers = headersObj as any;
      config.data = coerced;
    }
  }

  return config;
});

// ------------------------------
// ✅ 6) Response Interceptor: 401 시 refresh 후 1회 재시도
// ------------------------------
// 동시에 여러 요청이 401을 맞으면 refresh를 1번만 수행하도록 single-flight
let refreshPromise: Promise<Tokens | null> | null = null;

async function refreshTokensOnce(): Promise<Tokens | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return null;

      try {
        const res = await refreshClient.post(
          endpoints.auth.refresh,
          null,
          { headers: { Authorization: `Bearer ${refreshToken}` } }
        );

        const data = (res?.data ?? null) as any;
        const newAccess = typeof data?.accessToken === "string" ? data.accessToken : null;
        const newRefresh = typeof data?.refreshToken === "string" ? data.refreshToken : null;

        if (!newAccess || !newRefresh) return null;

        await Promise.all([setAccessToken(newAccess), setRefreshToken(newRefresh)]);
        return { accessToken: newAccess, refreshToken: newRefresh };
      } catch (e) {
        if (!axios.isAxiosError(e)) return null;

        const ax = e as AxiosError;
        attachNormalizedError(ax);

        const status = ax.response?.status;

        // ✅ D-2: refresh 관련
        // - 401: 재로그인 유도(토큰 재사용/만료 등)
        // - 403: 서버 권한 불일치 가능 (ROLE_REFRESH vs ROLE_REFRESH_ACTIVE/REPLAY)
        if (status === 403) {
          const n = (ax as any)?.normalized as NormalizedApiError | undefined;
          console.warn("[AUTH] refresh 403 (권한 불일치 가능):", n?.message ?? "Forbidden");
          return null;
        }
        if (status === 401) {
          return null;
        }

        // 일부 서버가 body를 강제하는 경우에만 1회 fallback
        const shouldFallback = status === 400 || status === 415;
        if (!shouldFallback) return null;

        const res = await refreshClient.post(
          endpoints.auth.refresh,
          { refreshToken },
          { headers: { Authorization: `Bearer ${refreshToken}` } }
        );

        const data = (res?.data ?? null) as any;
        const newAccess = typeof data?.accessToken === "string" ? data.accessToken : null;
        const newRefresh = typeof data?.refreshToken === "string" ? data.refreshToken : null;

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
    attachNormalizedError(error);

    const status = error?.response?.status;
    const originalConfig = error?.config as RetriableRequestConfig | undefined;

    if (!originalConfig) return Promise.reject(error);

    // permitAll/refresh/signup/users/exists/images 요청은 refresh 재시도 로직에서 제외
    if (isPermitAllEndpoint(originalConfig?.url)) {
      return Promise.reject(error);
    }

    // 인증 실패(401): refresh 후 원요청 1회 재시도
    if (status === 401 && !originalConfig._retry) {
      originalConfig._retry = true;

      const tokens = await refreshTokensOnce();
      if (!tokens?.accessToken) {
        await clearSession();
        return Promise.reject(error);
      }

      const headersObj = toHeadersObject(originalConfig.headers);
      headersObj.Authorization = `Bearer ${tokens.accessToken}`;
      originalConfig.headers = headersObj as any;

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

// 요약(3줄)
// - 응답 파싱을 Content-Type 무관(text→JSON 시도→text)으로 강제해 string/JSON 혼합을 안전 처리.
// - permitAll(/auth/login,/users,/users/exists,/images/**)은 access 주입·refresh 재시도에서 제외, 그 외는 Bearer access 자동 부착.
// - PATCH Applicant/POST 메시지 전송은 raw JSON string body를 자동 보정·검증하고, refresh 401/403은 재로그인 유도로 처리.