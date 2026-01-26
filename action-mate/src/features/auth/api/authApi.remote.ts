// src/features/auth/api/authApi.remote.ts
import axios from "axios";
import type { AxiosError } from "axios";
import type { Id } from "@/shared/model/types";
import type { AuthApi, LoginInput, ResetRequestResult, SignupInput, User } from "@/features/auth/model/types";
import { client } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/api/endpoints";
import type { ExistsResponse, TokenResponse, UserProfile } from "@/shared/api/schemas";
import { clearAuthTokens, getCurrentUserId, setAuthTokens, setCurrentUserId } from "@/shared/api/authToken";
import {
  mapAuthUserPatchToUserUpdateRequest,
  mapLoginInputToLoginRequest,
  mapSignupInputToSignupRequest,
  mapTokenResponseToTokens,
  mapUserProfileResponseToAuthUser,
} from "@/features/auth/model/mappers";
import { mapErrorResponse } from "@/shared/model/mappers";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

function extractHttpStatus(e: unknown): number | undefined {
  return axios.isAxiosError(e) ? e.response?.status : undefined;
}

function toErrorMessage(e: unknown, fallback = "요청 처리 중 오류가 발생했습니다."): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data;
    const mapped = mapErrorResponse(data);
    const mappedMsg = mapped?.message;
    if (mappedMsg && mappedMsg !== "알 수 없는 오류") return mappedMsg;

    const status = e.response?.status;
    if (status === 400) return "요청 값이 올바르지 않습니다.";
    if (status === 401) return "인증이 만료되었거나 올바르지 않습니다. 다시 로그인해주세요.";
    if (status === 403) return "권한이 없습니다.";
    if (status === 404) return "요청한 리소스를 찾을 수 없습니다.";
    if (status === 409) return "이미 사용 중인 아이디입니다.";
    if (status && status >= 500) return "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";

    if ((e as AxiosError).code === "ECONNABORTED") return "요청 시간이 초과되었습니다. 네트워크를 확인해주세요.";
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

function parseBooleanLike(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") {
    if (v === 1) return true;
    if (v === 0) return false;
    return null;
  }
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (["true", "1", "y", "yes"].includes(s)) return true;
    if (["false", "0", "n", "no"].includes(s)) return false;
    return null;
  }
  return null;
}

/**
 * ✅ /users/exists 응답 해석 (서버 구현 편차 흡수)
 * - OpenAPI: { exists: boolean }  => availability = !exists
 * - 실서버(관측): boolean primitive => availability 로 간주 (true=사용가능 / false=사용중)
 */
function resolveAvailabilityFromExistsResponse(data: unknown): boolean | null {
  const obj = data as any;

  const existsByObj = parseBooleanLike(obj?.exists);
  if (existsByObj != null) return !existsByObj;

  const availableByPrimitive = parseBooleanLike(data);
  if (availableByPrimitive != null) return availableByPrimitive;

  return null;
}

function compactUserPatch(patch: Partial<User>): Partial<User> {
  // undefined 키는 제거해서 필수 필드가 undefined로 덮이는 사고 방지
  const out: any = {};
  Object.entries(patch ?? {}).forEach(([k, v]) => {
    if (v !== undefined) out[k] = v;
  });
  return out as Partial<User>;
}

async function requestUpdateUserProfile(loginId: string, body: any): Promise<UserProfile> {
  // 서버 구현 편차: PATCH/PUT 둘 다 시도(405 등에서 fallback)
  try {
    const res = await client.patch<UserProfile>(endpoints.users.profile(loginId), body, { headers: JSON_HEADERS });
    return res.data;
  } catch (e) {
    const status = extractHttpStatus(e);
    if (status !== 405 && status !== 404) throw e;

    const res2 = await client.put<UserProfile>(endpoints.users.profile(loginId), body, { headers: JSON_HEADERS });
    return res2.data;
  }
}

const remoteApi: AuthApi = {
  async getUserByLoginId(loginId: string): Promise<User | null> {
    const safeId = (loginId ?? "").trim();
    if (!safeId) return null;

    try {
      const res = await client.get<UserProfile>(endpoints.users.profile(safeId));
      return mapUserProfileResponseToAuthUser(res.data);
    } catch (e) {
      const status = extractHttpStatus(e);
      if (status === 404) return null;
      throw new Error(toErrorMessage(e));
    }
  },

  async checkLoginIdAvailability(loginId: string): Promise<boolean> {
    const safeId = (loginId ?? "").trim();
    if (!safeId) return false;

    try {
      const res = await client.get<ExistsResponse | boolean>(endpoints.users.exists(safeId));
      const availability = resolveAvailabilityFromExistsResponse(res?.data);

      if (availability == null) {
        throw new Error("중복 확인 응답을 해석할 수 없습니다. (서버 응답 스키마 확인 필요)");
      }

      return availability;
    } catch (e) {
      throw new Error(toErrorMessage(e, "중복 확인에 실패했습니다. 잠시 후 다시 시도해주세요."));
    }
  },

  async signup(input: SignupInput): Promise<void> {
    const safeLoginId = (input?.loginId ?? "").trim();
    if (!safeLoginId) throw new Error("아이디를 입력해주세요.");

    const normalized: SignupInput = {
      loginId: safeLoginId,
      password: input?.password ?? "",
      nickname: (input?.nickname ?? "").trim(),
      gender: input?.gender as any,
      birthDate: input?.birthDate ?? "",
    };

    const body = mapSignupInputToSignupRequest(normalized);

    try {
      await client.post(endpoints.users.signup, body, { headers: JSON_HEADERS });
      return;
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },

  async login(input: LoginInput): Promise<User> {
    const safeLoginId = (input?.loginId ?? "").trim();
    const pw = input?.password ?? "";

    if (!safeLoginId) throw new Error("아이디를 입력해주세요.");
    if (!pw) throw new Error("비밀번호를 입력해주세요.");

    try {
      const req = mapLoginInputToLoginRequest({ loginId: safeLoginId, password: pw });

      const res = await client.post<TokenResponse>(endpoints.auth.login, req, {
        headers: JSON_HEADERS,
      });

      const tokens = mapTokenResponseToTokens(res.data);
      await setAuthTokens(tokens);
      await setCurrentUserId(safeLoginId);

      const user = await remoteApi.getUserByLoginId(safeLoginId);
      if (!user) {
        await clearAuthTokens();
        await setCurrentUserId("").catch(() => undefined);
        throw new Error("회원 정보를 불러올 수 없습니다.");
      }

      return user;
    } catch (e) {
      const status = extractHttpStatus(e);
      if (status === 401) throw new Error("아이디 또는 비밀번호가 일치하지 않습니다.");
      throw new Error(toErrorMessage(e));
    }
  },

  async updateUser(id: Id, patch: Partial<User>): Promise<User> {
    const safeId = String(id ?? "").trim();
    if (!safeId) throw new Error("사용자 식별자가 올바르지 않습니다.");

    const safePatch = compactUserPatch(patch);
    const reqBody = mapAuthUserPatchToUserUpdateRequest(safePatch);

    // 보낼 게 없으면 현재 프로필 재조회로 정리
    if (!reqBody || Object.keys(reqBody).length === 0) {
      const user = await remoteApi.getUserByLoginId(safeId);
      if (!user) throw new Error("회원 정보를 불러올 수 없습니다.");
      return user;
    }

    try {
      const updated = await requestUpdateUserProfile(safeId, reqBody);
      return mapUserProfileResponseToAuthUser(updated);
    } catch (e) {
      throw new Error(toErrorMessage(e, "회원 정보 수정에 실패했습니다."));
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

  async getCurrentLoginId(): Promise<string | null> {
    const v = await getCurrentUserId();
    const s = String(v ?? "").trim();
    return s ? s : null;
  },

  async setCurrentLoginId(loginId: string): Promise<void> {
    const safeId = (loginId ?? "").trim();
    if (!safeId) return;
    await setCurrentUserId(safeId);
  },

  async clearCurrentLoginId(): Promise<void> {
    await safeLogoutOnServer();
    await clearAuthTokens();
    await setCurrentUserId("").catch(() => undefined);
  },
};

export default remoteApi;
export { remoteApi as authApi };
