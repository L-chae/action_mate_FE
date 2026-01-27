// src/features/auth/api/authApi.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import type { AxiosError } from "axios";
import type { AuthApi, LoginInput, ResetRequestResult, SignupInput, User } from "@/features/auth/model/types";
import { client } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/api/endpoints";
import type { ApiUserProfileResponse, ExistsResponse, TokenResponse } from "@/shared/api/schemas";
import { clearAuthTokens, getCurrentUserId, setAuthTokens, setCurrentUserId } from "@/shared/api/authToken";
import {
  mapExistsResponseToAvailability,
  mapLoginInputToLoginRequest,
  mapSignupInputToSignupRequest,
  mapTokenResponseToTokens,
  mapUserProfileResponseToAuthUser,
} from "@/features/auth/model/mappers";
import { mapErrorResponse } from "@/shared/model/mappers";
import type { Id } from "@/shared/model/types";

// -----------------------------------------------------------------------------
// Flags (Mock/Remote 선택은 한 곳에서만 관리)
// -----------------------------------------------------------------------------
export const USE_MOCK_AUTH: boolean = __DEV__ && process.env.EXPO_PUBLIC_USE_MOCK === "true";

export const USE_MOCK_AUTO_LOGIN: boolean = USE_MOCK_AUTH && process.env.EXPO_PUBLIC_MOCK_AUTO_LOGIN === "true";

export const MOCK_AUTO_LOGIN_CREDENTIALS = {
  loginId: process.env.EXPO_PUBLIC_MOCK_LOGIN_ID ?? "user01",
  password: process.env.EXPO_PUBLIC_MOCK_PASSWORD ?? "1234",
} as const;

// -----------------------------------------------------------------------------
// Local(Mock) AuthApi
// -----------------------------------------------------------------------------

type StoredUser = User & { password: string };

const KEY_USERS = "localAuth:users";

// 비교용 정규화(대소문자/공백 혼재 방어)
const normKey = (v?: Id | string) => String(v ?? "").trim().toLowerCase();

let seedOncePromise: Promise<void> | null = null;

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJSON(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function findUserIndexByIdOrLoginId(users: StoredUser[], idOrLoginId: Id): number {
  const key = normKey(idOrLoginId);
  if (!key) return -1;

  const byId = users.findIndex((u) => normKey(u?.id) === key);
  if (byId !== -1) return byId;

  return users.findIndex((u) => normKey(u?.loginId) === key);
}

function sanitizeUserForUi(u: User | null | undefined): User | null {
  if (!u) return null;
  return {
    ...u,
    id: String((u as any)?.id ?? "unknown"),
    loginId: String((u as any)?.loginId ?? "unknown"),
    nickname: String((u as any)?.nickname ?? "알 수 없음") || "알 수 없음",
    avatarUrl: (u as any)?.avatarUrl ?? null,
    avatarImageName: (u as any)?.avatarImageName ?? null,
    birthDate: (u as any)?.birthDate ?? "",
    gender: (u as any)?.gender ?? "male",
  };
}

/**
 * 개발용 시드 데이터
 * - "한 번만" 실행되도록 락을 둬서 동시에 여러 API가 불려도 중복 seed를 방지
 */
async function ensureSeeded(): Promise<void> {
  seedOncePromise =
    seedOncePromise ??
    (async () => {
      const users = await readJSON<StoredUser[]>(KEY_USERS, []);
      const isCorrupted = users.some((u) => !u?.loginId);

      if (users.length === 0 || isCorrupted) {
        const demo: StoredUser[] = [
          {
            // ✅ 서버 모델과 동일: id === loginId
            id: "user01",
            loginId: "user01",
            nickname: "테니스왕",
            password: "1234",
            gender: "male",
            birthDate: "1995-06-15",
            avatarUrl: null,
            avatarImageName: null,
          },
          {
            id: "test01",
            loginId: "test01",
            nickname: "당근조아",
            password: "1234",
            gender: "female",
            birthDate: "1999-12-25",
            avatarUrl: null,
            avatarImageName: null,
          },
        ];

        await writeJSON(KEY_USERS, demo);
      }
    })();

  return seedOncePromise;
}

export const localAuthApi: AuthApi = {
  async getUserByLoginId(loginId: string): Promise<User | null> {
    await ensureSeeded();

    const target = normKey(loginId);
    const users = await readJSON<StoredUser[]>(KEY_USERS, []);
    const found = users.find((u) => normKey(u?.loginId) === target);

    if (!found) return null;

    const { password: _pw, ...user } = found;
    return sanitizeUserForUi(user) as User;
  },

  async checkLoginIdAvailability(loginId: string): Promise<boolean> {
    await ensureSeeded();

    const target = normKey(loginId);
    const users = await readJSON<StoredUser[]>(KEY_USERS, []);
    const exists = users.some((u) => normKey(u?.loginId) === target);
    return !exists;
  },

  async signup(input: SignupInput): Promise<User> {
    await ensureSeeded();

    const loginId = String(input?.loginId ?? "").trim();
    const loginKey = normKey(loginId);
    const nickname = String(input?.nickname ?? "").trim();

    if (!loginId) throw new Error("아이디를 입력해주세요.");
    if (!nickname || nickname.length < 2) throw new Error("닉네임은 2글자 이상 입력해주세요.");
    if (String(input?.password ?? "").length < 4) throw new Error("비밀번호는 4자 이상으로 입력해주세요.");
    if (!input?.gender) throw new Error("성별을 선택해주세요.");
    if (!input?.birthDate) throw new Error("생년월일을 입력해주세요.");

    const users = await readJSON<StoredUser[]>(KEY_USERS, []);
    if (users.some((u) => normKey(u?.loginId) === loginKey)) {
      throw new Error("이미 사용 중인 아이디예요.");
    }

    const newUser: User = {
      // ✅ 서버 모델과 일치: id === loginId
      id: loginId,
      loginId,
      nickname,
      gender: input.gender,
      birthDate: input.birthDate,
      avatarUrl: null,
      avatarImageName: null,
    };

    await writeJSON(KEY_USERS, [...users, { ...(sanitizeUserForUi(newUser) as User), password: input.password }]);
    return sanitizeUserForUi(newUser) as User;
  },

  async login(input: LoginInput): Promise<User> {
    await ensureSeeded();

    const loginId = String(input?.loginId ?? "").trim();
    const target = normKey(loginId);

    const users = await readJSON<StoredUser[]>(KEY_USERS, []);
    const found = users.find((u) => normKey(u?.loginId) === target);

    if (!found) throw new Error("존재하지 않는 아이디예요.");
    if (String(found?.password ?? "") !== String(input?.password ?? "")) {
      throw new Error("비밀번호가 일치하지 않아요.");
    }

    const { password: _pw, ...user } = found;

    await Promise.all([
      setAuthTokens({
        accessToken: `mock_access_${Date.now()}`,
        refreshToken: `mock_refresh_${Date.now()}`,
      }),
      setCurrentUserId(String((user as any)?.loginId ?? loginId)),
    ]);

    return (sanitizeUserForUi(user) as User) ?? (sanitizeUserForUi({ ...(user as any), loginId } as any) as User);
  },

  async updateUser(id: Id, patch: Partial<User>): Promise<User> {
    await ensureSeeded();

    const users = await readJSON<StoredUser[]>(KEY_USERS, []);
    const idx = findUserIndexByIdOrLoginId(users, id);

    if (idx === -1) throw new Error("사용자를 찾을 수 없습니다.");

    const existing = users[idx];

    // id/loginId는 변경 금지
    const sanitizedPatch: Partial<User> = { ...(patch ?? {}) };
    delete (sanitizedPatch as any).id;
    delete (sanitizedPatch as any).loginId;

    const updated: StoredUser = {
      ...existing,
      ...sanitizedPatch,
      id: existing.id,
      loginId: existing.loginId,
      password: existing.password,
      avatarUrl: (sanitizedPatch as any)?.avatarUrl ?? existing.avatarUrl ?? null,
      avatarImageName: (sanitizedPatch as any)?.avatarImageName ?? existing.avatarImageName ?? null,
    };

    users[idx] = updated;
    await writeJSON(KEY_USERS, users);

    const { password: __pw, ...safeUser } = updated;
    return sanitizeUserForUi(safeUser) as User;
  },

  async updatePassword(loginId: string, newPassword: string): Promise<void> {
    await ensureSeeded();

    if (!newPassword || newPassword.length < 4) throw new Error("비밀번호는 4자 이상으로 입력해주세요.");

    const users = await readJSON<StoredUser[]>(KEY_USERS, []);
    const idx = findUserIndexByIdOrLoginId(users, loginId);
    if (idx === -1) throw new Error("사용자를 찾을 수 없습니다.");

    users[idx].password = newPassword;
    await writeJSON(KEY_USERS, users);
  },

  async requestPasswordReset(loginId: string): Promise<ResetRequestResult> {
    await ensureSeeded();

    const user = await localAuthApi.getUserByLoginId(loginId);
    if (!user) throw new Error("가입되지 않은 아이디입니다.");
    return { code: "123456" };
  },

  async verifyPasswordResetCode(_loginId: string, code: string): Promise<void> {
    if (code !== "123456") throw new Error("인증 코드가 올바르지 않습니다.");
  },

  async consumePasswordResetCode(_loginId: string): Promise<void> {
    return;
  },

  async getCurrentLoginId(): Promise<string | null> {
    return getCurrentUserId();
  },

  async setCurrentLoginId(loginId: string): Promise<void> {
    const v = String(loginId ?? "").trim();
    if (!v) return;
    await setCurrentUserId(v);
  },

  async clearCurrentLoginId(): Promise<void> {
    await clearAuthTokens();
  },
};

// -----------------------------------------------------------------------------
// Remote AuthApi (OpenAPI 기반)
// -----------------------------------------------------------------------------

const JSON_HEADERS = {
  "Content-Type": "application/json",
} as const;

function extractHttpStatus(e: unknown): number | undefined {
  return axios.isAxiosError(e) ? e.response?.status : undefined;
}

function toErrorMessage(e: unknown, fallback = "요청 처리 중 오류가 발생했습니다."): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data;
    const mapped = mapErrorResponse(data);
    if (mapped?.message && mapped.message !== "알 수 없는 오류") return mapped.message;

    const status = e.response?.status;
    if (status === 401) return "인증이 만료되었거나 올바르지 않습니다. 다시 로그인해주세요.";
    if (status === 403) return "권한이 없습니다.";
    if (status === 404) return "요청한 리소스를 찾을 수 없습니다.";
    if (status && status >= 500) return "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";

    if ((e as AxiosError)?.code === "ECONNABORTED") {
      return "요청 시간이 초과되었습니다. 네트워크를 확인해주세요.";
    }
  }

  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

async function safeLogoutOnServer(): Promise<void> {
  try {
    await client.get(endpoints.auth.logout);
  } catch {
    // ignore
  }
}

function normalizeLoginId(v: unknown): string {
  return String(v ?? "").trim();
}

function normalizeIdCandidate(v: unknown): string | null {
  if (typeof v === "string") {
    const t = v.trim();
    return t ? t : null;
  }
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

/**
 * 로그인 응답(TokenResponse)에서 userId/loginId/id 등을 최대한 안전하게 추출
 * - 서버 명세가 바뀌거나, 백엔드가 userId를 내려주는 경우에 대비
 */
function extractUserIdFromTokenResponse(data: unknown): string | null {
  const d = data as any;

  const candidates: unknown[] = [
    d?.userId,
    d?.id,
    d?.memberId,
    d?.accountId,
    d?.loginId,
    d?.data?.userId,
    d?.data?.id,
    d?.data?.memberId,
    d?.data?.accountId,
    d?.data?.loginId,
  ];

  for (const c of candidates) {
    const v = normalizeIdCandidate(c);
    if (v) return v;
  }
  return null;
}

/**
 * "내 프로필" 엔드포인트가 존재하면 우선 사용 (/users/me 등)
 * - 존재하지 않거나 실패하면 null
 */
async function tryFetchMyProfile(): Promise<User | null> {
  const anyEndpoints = endpoints as unknown as any;
  const anyUsers = anyEndpoints?.users;
  const anyAuth = anyEndpoints?.auth;

  const endpointCandidates: unknown[] = [anyUsers?.me, anyUsers?.profileMe, anyAuth?.me];

  for (const ep of endpointCandidates) {
    try {
      const url =
        typeof ep === "string"
          ? ep
          : typeof ep === "function" && (ep as Function).length === 0
            ? (ep as Function)()
            : null;

      if (!url || typeof url !== "string") continue;

      const res = await client.get<ApiUserProfileResponse>(url);
      return mapUserProfileResponseToAuthUser(res.data);
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * 식별자(로그인아이디 or userId)로 프로필을 가져오는 공통 로직
 * - 프로젝트마다 실제 엔드포인트 이름이 다를 수 있어, 존재하는 함수를 우선 탐색
 */
async function fetchUserProfileByIdentifier(identifier: string): Promise<User | null> {
  const id = normalizeLoginId(identifier);
  if (!id) return null;

  const anyEndpoints = endpoints as unknown as any;
  const anyUsers = anyEndpoints?.users;

  const url =
    typeof anyUsers?.profileByLoginId === "function"
      ? anyUsers.profileByLoginId(id)
      : typeof anyUsers?.byLoginId === "function"
        ? anyUsers.byLoginId(id)
        : typeof anyUsers?.profile === "function"
          ? anyUsers.profile(id)
          : null;

  if (!url || typeof url !== "string") {
    throw new Error("유저 프로필 조회 엔드포인트가 설정되어 있지 않습니다.");
  }

  try {
    const res = await client.get<ApiUserProfileResponse>(url);
    return mapUserProfileResponseToAuthUser(res.data);
  } catch (e) {
    if (extractHttpStatus(e) === 404) return null;
    throw e;
  }
}

export const remoteAuthApi: AuthApi = {
  async getUserByLoginId(loginId: string): Promise<User | null> {
    const id = normalizeLoginId(loginId);
    if (!id) return null;

    try {
      return await fetchUserProfileByIdentifier(id);
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },

  async checkLoginIdAvailability(loginId: string): Promise<boolean> {
    const id = normalizeLoginId(loginId);
    if (!id) return false;

    try {
      const res = await client.get<ExistsResponse>(endpoints.users.exists(id));
      return mapExistsResponseToAvailability(res.data);
    } catch {
      try {
        const user = await remoteAuthApi.getUserByLoginId(id);
        return user == null;
      } catch {
        return false;
      }
    }
  },

  async signup(input: SignupInput): Promise<User> {
    const body = mapSignupInputToSignupRequest(input);
    const loginId = normalizeLoginId(input?.loginId);

    try {
      await client.post(endpoints.users.signup, body, { headers: JSON_HEADERS });

      const user = await remoteAuthApi.getUserByLoginId(loginId);
      if (user) return user;

      return {
        id: loginId || "unknown",
        loginId: loginId || "unknown",
        nickname: String(input?.nickname ?? "").trim() || "알 수 없음",
        gender: input?.gender ?? "male",
        birthDate: input?.birthDate ?? "",
        avatarUrl: null,
        avatarImageName: null,
      };
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },

  async login(input: LoginInput): Promise<User> {
    const loginId = normalizeLoginId(input?.loginId);

    try {
      const req = mapLoginInputToLoginRequest(input);

      const res = await client.post<TokenResponse>(endpoints.auth.login, req, { headers: JSON_HEADERS });

      const tokens = mapTokenResponseToTokens(res.data);
      if (!tokens?.accessToken || !tokens?.refreshToken) {
        throw new Error("토큰을 발급받지 못했습니다.");
      }

      await setAuthTokens(tokens);

      const userIdFromLogin = extractUserIdFromTokenResponse(res.data);
      const identifier = normalizeLoginId(userIdFromLogin ?? loginId);

      if (identifier) {
        await setCurrentUserId(identifier);
      }

      const user = (await tryFetchMyProfile()) ?? (identifier ? await fetchUserProfileByIdentifier(identifier) : null);

      if (!user) {
        await clearAuthTokens();
        throw new Error("회원 정보를 불러올 수 없습니다.");
      }

      const stableId = normalizeLoginId((user as any)?.id ?? (user as any)?.loginId ?? identifier);
      if (stableId) {
        await setCurrentUserId(stableId);
      }

      return user;
    } catch (e) {
      const status = extractHttpStatus(e);
      if (status === 401) throw new Error("아이디 또는 비밀번호가 일치하지 않습니다.");
      throw new Error(toErrorMessage(e));
    }
  },

  async updatePassword(_loginId: string, _newPassword: string): Promise<void> {
    throw new Error("서버 명세에 비밀번호 변경 API가 없습니다.");
  },

  async requestPasswordReset(_loginId: string): Promise<ResetRequestResult> {
    throw new Error("서버 명세에 비밀번호 재설정 API가 없습니다.");
  },

  async verifyPasswordResetCode(_loginId: string, _code: string): Promise<void> {
    throw new Error("서버 명세에 비밀번호 재설정 API가 없습니다.");
  },

  async consumePasswordResetCode(_loginId: string): Promise<void> {
    throw new Error("서버 명세에 비밀번호 재설정 API가 없습니다.");
  },

  async updateUser(_id: string, _patch: Partial<User>): Promise<User> {
    throw new Error("서버에 회원 정보 수정 API가 아직 없습니다.");
  },

  async getCurrentLoginId(): Promise<string | null> {
    return getCurrentUserId();
  },

  async setCurrentLoginId(loginId: string): Promise<void> {
    const v = normalizeLoginId(loginId);
    if (!v) return;
    await setCurrentUserId(v);
  },

  async clearCurrentLoginId(): Promise<void> {
    await safeLogoutOnServer();
    await clearAuthTokens();
  },
};

// -----------------------------------------------------------------------------
// Selected 구현체 (default export)
// -----------------------------------------------------------------------------
export const authApi: AuthApi = USE_MOCK_AUTH ? localAuthApi : remoteAuthApi;
export default authApi;

// 3줄 요약
// - local/remote/index로 나뉜 AuthApi를 authApi.ts 한 파일로 통합했습니다.
// - USE_MOCK_AUTH 플래그로 구현체 선택을 한 곳에서만 관리합니다.
// - 기존 동작(토큰/세션 저장, 에러 메시지 방어, 프로필 로딩 fallback)을 유지했습니다.