// src/features/auth/api/authApi.remote.ts
import axios from "axios";
import type { AxiosError } from "axios";
import type {
  AuthApi,
  LoginInput,
  ResetRequestResult,
  SignupInput,
  User,
} from "@/features/auth/model/types";
import { client } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/api/endpoints";
import type {
  ApiUserProfileResponse,
  ExistsResponse,
  TokenResponse,
} from "@/shared/api/schemas";
import {
  clearAuthTokens,
  getCurrentUserId,
  setAuthTokens,
  setCurrentUserId,
} from "@/shared/api/authToken";
import {
  mapExistsResponseToAvailability,
  mapLoginInputToLoginRequest,
  mapSignupInputToSignupRequest,
  mapTokenResponseToTokens,
  mapUserProfileResponseToAuthUser,
} from "@/features/auth/model/mappers";
import { mapErrorResponse } from "@/shared/model/mappers";

/**
 * Remote AuthApi (OpenAPI 기반)
 *
 * - 서버 응답 스키마 변화/불안정성은 "mapper + error mapper"에서만 흡수
 * - 화면/스토어는 UI 모델(User)과 명확한 에러 메시지만 다루도록 단순화
 * - 로그아웃은 "서버 시도 + 로컬 세션 정리"를 한 곳에서 책임
 */

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

    if ((e as AxiosError).code === "ECONNABORTED") {
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

const remoteApi: AuthApi = {
  /**
   * 유저 조회
   * - userId는 서버 명세상 문자열이며, 본 앱에선 loginId와 동일하게 취급
   */
  async getUserByLoginId(loginId: string): Promise<User | null> {
    const id = normalizeLoginId(loginId);
    if (!id) return null;

    try {
      const res = await client.get<ApiUserProfileResponse>(endpoints.users.profile(id));
      return mapUserProfileResponseToAuthUser(res.data);
    } catch (e) {
      if (extractHttpStatus(e) === 404) return null;
      throw new Error(toErrorMessage(e));
    }
  },

  /**
   * 아이디 중복 확인
   * - 서버: { exists: boolean }
   * - 프론트: availability(boolean) = !exists
   */
  async checkLoginIdAvailability(loginId: string): Promise<boolean> {
    const id = normalizeLoginId(loginId);
    if (!id) return false;

    try {
      const res = await client.get<ExistsResponse>(endpoints.users.exists(id));
      return mapExistsResponseToAvailability(res.data);
    } catch {
      try {
        const user = await remoteApi.getUserByLoginId(id);
        return user == null;
      } catch {
        return false;
      }
    }
  },

  /**
   * 회원가입
   * - OpenAPI SignupRequest에 nickname 포함(명세 기준)
   * - 가입 직후 profile 재조회로 서버 보정값(이미지/닉네임 등)을 반영
   */
  async signup(input: SignupInput): Promise<User> {
    const body = mapSignupInputToSignupRequest(input);
    const loginId = normalizeLoginId(input?.loginId);

    try {
      await client.post(endpoints.users.signup, body, { headers: JSON_HEADERS });

      const user = await remoteApi.getUserByLoginId(loginId);
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

  /**
   * 로그인
   * - 토큰 저장 → currentUserId 저장 → 유저 프로필 로딩
   * - 프로필 로딩 실패 시 세션 정리(일관성)
   */
  async login(input: LoginInput): Promise<User> {
    const loginId = normalizeLoginId(input?.loginId);

    try {
      const req = mapLoginInputToLoginRequest(input);

      const res = await client.post<TokenResponse>(endpoints.auth.login, req, {
        headers: JSON_HEADERS,
      });

      const tokens = mapTokenResponseToTokens(res.data);
      if (!tokens?.accessToken || !tokens?.refreshToken) {
        throw new Error("토큰을 발급받지 못했습니다.");
      }

      await setAuthTokens(tokens);

      // 현재 로그인 아이디(=userId) 저장
      if (loginId) {
        await setCurrentUserId(loginId);
      }

      const user = await remoteApi.getUserByLoginId(loginId);
      if (!user) {
        await clearAuthTokens();
        throw new Error("회원 정보를 불러올 수 없습니다.");
      }

      // 혹시 모를 공백/케이스 문제 방지: 확정값으로 재저장
      await setCurrentUserId(user.loginId);

      return user;
    } catch (e) {
      const status = extractHttpStatus(e);
      if (status === 401) throw new Error("아이디 또는 비밀번호가 일치하지 않습니다.");
      throw new Error(toErrorMessage(e));
    }
  },

  // --- 명세에 없는 기능들은 명확하게 실패 처리 ---
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

  // --- 세션 관리 ---
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

export default remoteApi;
export { remoteApi as authApi };

/**
 * 3줄 요약
 * - profileImageName 기반(User mapper)으로 avatarUrl을 생성하도록 이미 변경된 mapper를 그대로 사용합니다.
 * - 로그인/회원가입 시 currentUserId 저장과 토큰 저장 순서를 고정하고, 프로필 조회 실패 시 세션을 정리합니다.
 * - 명세에 없는 기능(update/password reset)은 명확한 에러로 실패 처리해 런타임 혼선을 줄였습니다.
 */