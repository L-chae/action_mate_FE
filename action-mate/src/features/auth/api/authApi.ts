// src/features/auth/api/authApi.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import type { AuthApi, LoginInput, ResetRequestResult, SignupInput, User } from "@/features/auth/model/types";
import { client, normalizeApiError } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/api/endpoints";
import type { ExistsResponse, ProfileRequest, TokenResponse } from "@/shared/api/schemas";
import { clearAuthTokens, getCurrentUserId, setAuthTokens, setCurrentUserId } from "@/shared/api/authToken";
import { mapLoginInputToLoginRequest, mapSignupInputToSignupRequest } from "@/features/auth/model/mappers";
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

  const byId = users.findIndex((u) => normKey((u as any)?.id) === key);
  if (byId !== -1) return byId;

  return users.findIndex((u) => normKey((u as any)?.loginId) === key);
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
      const isCorrupted = users.some((u) => !(u as any)?.loginId);

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
    const found = users.find((u) => normKey((u as any)?.loginId) === target);

    if (!found) return null;

    const { password: _pw, ...user } = found;
    return sanitizeUserForUi(user) as User;
  },

  async checkLoginIdAvailability(loginId: string): Promise<boolean> {
    await ensureSeeded();

    const target = normKey(loginId);
    const users = await readJSON<StoredUser[]>(KEY_USERS, []);
    const exists = users.some((u) => normKey((u as any)?.loginId) === target);
    return !exists;
  },

  async signup(input: SignupInput): Promise<User> {
    await ensureSeeded();

    const loginId = String((input as any)?.loginId ?? "").trim();
    const loginKey = normKey(loginId);
    const nickname = String((input as any)?.nickname ?? "").trim();

    if (!loginId) throw new Error("아이디를 입력해주세요.");
    if (!nickname || nickname.length < 2) throw new Error("닉네임은 2글자 이상 입력해주세요.");
    if (String((input as any)?.password ?? "").length < 4) throw new Error("비밀번호는 4자 이상으로 입력해주세요.");
    if (!(input as any)?.gender) throw new Error("성별을 선택해주세요.");
    if (!(input as any)?.birthDate) throw new Error("생년월일을 입력해주세요.");

    const users = await readJSON<StoredUser[]>(KEY_USERS, []);
    if (users.some((u) => normKey((u as any)?.loginId) === loginKey)) {
      throw new Error("이미 사용 중인 아이디예요.");
    }

    const newUser: User = {
      // ✅ 서버 모델과 일치: id === loginId
      id: loginId,
      loginId,
      nickname,
      gender: (input as any)?.gender,
      birthDate: (input as any)?.birthDate,
      avatarUrl: null,
      avatarImageName: null,
    } as User;

    await writeJSON(KEY_USERS, [...users, { ...(sanitizeUserForUi(newUser) as User), password: String((input as any)?.password ?? "") }]);
    return sanitizeUserForUi(newUser) as User;
  },

  async login(input: LoginInput): Promise<User> {
    await ensureSeeded();

    const loginId = String((input as any)?.loginId ?? "").trim();
    const target = normKey(loginId);

    const users = await readJSON<StoredUser[]>(KEY_USERS, []);
    const found = users.find((u) => normKey((u as any)?.loginId) === target);

    if (!found) throw new Error("존재하지 않는 아이디예요.");
    if (String((found as any)?.password ?? "") !== String((input as any)?.password ?? "")) {
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
      id: (existing as any).id,
      loginId: (existing as any).loginId,
      password: (existing as any).password,
      avatarUrl: (sanitizedPatch as any)?.avatarUrl ?? (existing as any)?.avatarUrl ?? null,
      avatarImageName: (sanitizedPatch as any)?.avatarImageName ?? (existing as any)?.avatarImageName ?? null,
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
// Remote AuthApi (서버 확정 명세 기반)
// -----------------------------------------------------------------------------

const JSON_HEADERS = {
  "Content-Type": "application/json",
} as const;

function extractHttpStatus(e: unknown): number | undefined {
  if (axios.isAxiosError(e)) return e.response?.status;
  const n = (e as any)?.normalized;
  if (n && typeof n.status === "number") return n.status;
  return undefined;
}

function toErrorMessage(e: unknown, fallback = "요청 처리 중 오류가 발생했습니다."): string {
  const normalized = normalizeApiError(e);
  const status = normalized?.status ?? null;

  if (axios.isAxiosError(e) && (e as any)?.code === "ECONNABORTED") {
    return "요청 시간이 초과되었습니다. 네트워크를 확인해주세요.";
  }

  if (status === 401) return "인증이 만료되었거나 올바르지 않습니다. 다시 로그인해주세요.";
  if (status === 403) return "권한이 없거나 서버 권한 설정이 일치하지 않습니다. 다시 로그인해주세요.";
  if (status === 404) return "요청한 리소스를 찾을 수 없습니다.";
  if (typeof status === "number" && status >= 500) return "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";

  const msg = String(normalized?.message ?? "").trim();
  return msg ? msg : fallback;
}

function normalizeLoginId(v: unknown): string {
  return String(v ?? "").trim();
}

function toUiGenderFromServer(g: unknown): "male" | "female" {
  const v = String(g ?? "").trim().toUpperCase();
  return v === "F" ? "female" : "male";
}

function toServerGenderFromUi(g: unknown): "M" | "F" {
  const v = String(g ?? "").trim().toLowerCase();
  if (v === "f" || v === "female") return "F";
  if (v === "m" || v === "male") return "M";
  const upper = String(g ?? "").trim().toUpperCase();
  if (upper === "F") return "F";
  if (upper === "M") return "M";
  return "M";
}

function normalizeBirthDate(v: unknown): string {
  const s = String(v ?? "").trim();
  return s || "2000-01-01";
}

function mapProfileRequestToAuthUser(profile: unknown, fallbackUserId: string): User {
  const p = (profile ?? {}) as any;
  const userId = normalizeLoginId(p?.userId ?? fallbackUserId) || fallbackUserId || "unknown";

  const nickname = String(p?.nickname ?? "").trim() || "알 수 없음";
  const birth = normalizeBirthDate(p?.birth);
  const gender = toUiGenderFromServer(p?.gender);

  const profileValue = p?.profile;
  const avatarCandidate = typeof profileValue === "string" && profileValue.trim() ? profileValue.trim() : null;

  return {
    id: userId,
    loginId: userId,
    nickname,
    gender,
    birthDate: birth,
    avatarUrl: avatarCandidate,
    avatarImageName: avatarCandidate,
  } as User;
}

function extractTokens(data: unknown): { accessToken: string; refreshToken: string } | null {
  const d = (data ?? {}) as any;
  const access = typeof d?.accessToken === "string" ? d.accessToken : null;
  const refresh = typeof d?.refreshToken === "string" ? d.refreshToken : null;
  if (!access || !refresh) return null;
  return { accessToken: access, refreshToken: refresh };
}

async function fetchUserProfileByUserId(userId: string): Promise<User> {
  const id = normalizeLoginId(userId);
  if (!id) throw new Error("유저 아이디가 올바르지 않습니다.");

  const res = await client.get<ProfileRequest>(endpoints.users.profile(id));
  const data = (res as any)?.data ?? null;

  try {
    // 외부 mapper가 존재하면(프로젝트 기존 로직) 우선 활용, 실패 시 fallback
    const anyMappers = require("@/features/auth/model/mappers") as any;
    const mapper = anyMappers?.mapUserProfileResponseToAuthUser;
    const mapped = typeof mapper === "function" ? mapper(data) : null;
    if (mapped) return mapped as User;
  } catch {
    // ignore
  }

  return mapProfileRequestToAuthUser(data, id);
}

function parseExistsResponse(data: ExistsResponse | unknown): boolean {
  if (typeof data === "boolean") return data;

  const d = data as any;
  if (d && typeof d.exists === "boolean") return d.exists;
  if (d && typeof d.available === "boolean") return d.available;
  return false;
}

function isLocalFileUri(uri: string): boolean {
  const u = String(uri ?? "").trim().toLowerCase();
  return u.startsWith("file://") || u.startsWith("content://") || u.startsWith("ph://");
}

function appendJsonPart(form: FormData, name: string, obj: unknown): void {
  const json = JSON.stringify(obj ?? {});
  try {
    const blob = new Blob([json], { type: "application/json" });
    form.append(name, blob as any);
  } catch {
    form.append(name, json as any);
  }
}

function appendImagePartIfAny(form: FormData, patch: Partial<User>): void {
  const anyPatch = (patch ?? {}) as any;

  const fileLike =
    anyPatch?.image ??
    anyPatch?.avatarFile ??
    anyPatch?.file ??
    (typeof anyPatch?.uri === "string" ? anyPatch : null) ??
    null;

  if (fileLike && typeof fileLike?.uri === "string" && String(fileLike.uri).trim()) {
    const uri = String(fileLike.uri).trim();
    const name = String(fileLike?.name ?? "profile.jpg");
    const type = String(fileLike?.type ?? "image/jpeg");
    form.append("image", { uri, name, type } as any);
    return;
  }

  const avatarUrl = typeof anyPatch?.avatarUrl === "string" ? anyPatch.avatarUrl.trim() : "";
  if (avatarUrl && isLocalFileUri(avatarUrl)) {
    form.append("image", { uri: avatarUrl, name: "profile.jpg", type: "image/jpeg" } as any);
  }
}

export const remoteAuthApi: AuthApi = {
  async getUserByLoginId(loginId: string): Promise<User | null> {
    const id = normalizeLoginId(loginId);
    if (!id) return null;

    try {
      // ✅ /api/**는 기본적으로 ACCESS 필요 (로그인 이후 사용 전제)
      return await fetchUserProfileByUserId(id);
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },

  async checkLoginIdAvailability(loginId: string): Promise<boolean> {
    const id = normalizeLoginId(loginId);
    if (!id) return false;

    try {
      // ✅ /users/exists 는 permitAll, 200 boolean (true=사용가능, false=사용불가)
      const res = await client.get<ExistsResponse>(endpoints.users.exists(id));
      return parseExistsResponse((res as any)?.data);
    } catch (e) {
      // 네트워크/서버 오류면 보수적으로 "불가" 처리
      return false;
    }
  },

  async signup(input: SignupInput): Promise<User> {
    const body = mapSignupInputToSignupRequest(input);
    const loginId = normalizeLoginId((input as any)?.loginId);

    try {
      // ✅ /users permitAll, 성공 시 string("성공")일 수 있어도 오류로 취급 금지
      await client.post(endpoints.users.signup, body, { headers: JSON_HEADERS });

      // signup 직후엔 ACCESS가 없으므로 /users/{id}/profile 호출 시 401 가능 → 로컬 구성으로 반환
      return {
        id: loginId || "unknown",
        loginId: loginId || "unknown",
        nickname: String((input as any)?.nickname ?? "").trim() || "알 수 없음",
        gender: (input as any)?.gender ?? "male",
        birthDate: String((input as any)?.birthDate ?? "").trim() || "",
        avatarUrl: null,
        avatarImageName: null,
      } as User;
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },

  async login(input: LoginInput): Promise<User> {
    const loginId = normalizeLoginId((input as any)?.loginId);

    try {
      const req = mapLoginInputToLoginRequest(input);

      // ✅ /auth/login permitAll
      const res = await client.post<TokenResponse>(endpoints.auth.login, req, { headers: JSON_HEADERS });

      const tokens = extractTokens((res as any)?.data);
      if (!tokens?.accessToken || !tokens?.refreshToken) {
        throw new Error("토큰을 발급받지 못했습니다.");
      }

      await setAuthTokens(tokens);

      // ✅ 토큰 subject = username(=userId) 전제: 로그인 입력 id를 currentUserId로 저장
      if (loginId) {
        await setCurrentUserId(loginId);
      }

      // ✅ /users/{id}/profile (ACCESS)
      const user = loginId ? await fetchUserProfileByUserId(loginId) : null;

      if (!user) {
        await clearAuthTokens();
        throw new Error("회원 정보를 불러올 수 없습니다.");
      }

      const stableId = normalizeLoginId((user as any)?.id ?? (user as any)?.loginId ?? loginId);
      if (stableId) {
        await setCurrentUserId(stableId);
      }

      return user;
    } catch (e) {
      const status = extractHttpStatus(e);
      // ✅ 로그인 실패는 403(ErrorResponse) 가능
      if (status === 401 || status === 403) throw new Error("아이디 또는 비밀번호가 일치하지 않습니다.");
      await clearAuthTokens();
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

  async updateUser(id: string, patch: Partial<User>): Promise<User> {
    try {
      // ✅ multipart 규칙 강제: data 파트명 고정, data.userId는 로그인 사용자와 동일
      const current = await getCurrentUserId();
      const userId = normalizeLoginId(current ?? id);
      if (!userId) throw new Error("로그인 정보가 없습니다. 다시 로그인해주세요.");

      // 기존 프로필을 가져와 누락 필드를 채움(서버는 nickname/gender/birth만 저장)
      let existing: User | null = null;
      try {
        existing = await fetchUserProfileByUserId(userId);
      } catch {
        existing = null;
      }

      const nickname =
        String((patch as any)?.nickname ?? "").trim() ||
        String((existing as any)?.nickname ?? "").trim() ||
        "알 수 없음";

      const birth =
        normalizeBirthDate((patch as any)?.birthDate ?? (existing as any)?.birthDate ?? "");

      const uiGender = (patch as any)?.gender ?? (existing as any)?.gender ?? "male";
      const serverGender = toServerGenderFromUi(uiGender);

      const profilePayload: ProfileRequest = {
        userId,
        nickname,
        gender: serverGender,
        birth,
        // 서버가 저장하지 않더라도 필드 요구 스키마를 맞춤
        profile: String((existing as any)?.avatarUrl ?? "") || "",
      };

      const form = new FormData();
      appendJsonPart(form, "data", profilePayload);
      appendImagePartIfAny(form, patch);

      await client.put(endpoints.users.update, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // 수정 후 최신 프로필 재조회
      const updated = await fetchUserProfileByUserId(userId);

      // 업데이트 후에도 currentUserId는 동일해야 함
      await setCurrentUserId(userId);

      return sanitizeUserForUi(updated) as User;
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
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
    // ✅ 서버에 /auth/logout 없음
    await clearAuthTokens();
  },
};

// -----------------------------------------------------------------------------
// Selected 구현체 (default export)
// -----------------------------------------------------------------------------
export const authApi: AuthApi = USE_MOCK_AUTH ? localAuthApi : remoteAuthApi;
export default authApi;

/*
요약(3줄)
- 서버 확정 명세로 remoteAuthApi를 단순화(/users/exists는 boolean, 로그인 실패는 403 가능, 프로필은 /users/{id}/profile).
- 프로필 수정은 multipart(data+image) 규칙을 강제하고 data.userId를 로그인 사용자로 고정해 500(mismatch) 위험을 줄임.
- 에러 메시지는 normalizeApiError 기반으로 string/ErrorResponse/spring-default-error 혼합을 안전 처리.
*/