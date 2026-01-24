// src/features/auth/api/authApi.remote.ts
import axios from "axios";
import type { AxiosError } from "axios";
import type { User, SignupInput, LoginInput, AuthApi, ResetRequestResult } from "@/features/auth/model/types";
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

/**
 * Remote AuthApi (OpenAPI 기반)
 *
 * 설계 의도(왜 이렇게?):
 * - 서버 응답 스키마 변화/불안정성은 "mapper + error mapper"에서만 흡수
 * - 화면/스토어는 UI 모델(User)과 명확한 에러 메시지만 다루도록 단순화
 * - 로그아웃은 "서버 시도 + 로컬 세션 정리"를 한 곳에서 책임져 중복 호출을 방지
 */

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

function extractHttpStatus(e: unknown): number | undefined {
  return axios.isAxiosError(e) ? e.response?.status : undefined;
}

function toErrorMessage(e: unknown, fallback = "요청 처리 중 오류가 발생했습니다."): string {
  // 서버 표준 에러 포맷(code/message)이 오는 경우 우선 사용
  if (axios.isAxiosError(e)) {
    const data = e.response?.data;
    const mapped = mapErrorResponse(data);
    if (mapped.message && mapped.message !== "알 수 없는 오류") return mapped.message;

    // 표준 포맷이 없을 때는 status 기반으로 UX 메시지 보강
    const status = e.response?.status;
    if (status === 401) return "인증이 만료되었거나 올바르지 않습니다. 다시 로그인해주세요.";
    if (status === 403) return "권한이 없습니다.";
    if (status === 404) return "요청한 리소스를 찾을 수 없습니다.";
    if (status && status >= 500) return "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";

    // 네트워크/타임아웃 등
    if ((e as AxiosError).code === "ECONNABORTED") return "요청 시간이 초과되었습니다. 네트워크를 확인해주세요.";
  }

  if (e instanceof Error && e.message) return e.message;
  return fallback;
}

async function safeLogoutOnServer(): Promise<void> {
  // 서버 로그아웃은 실패해도 로컬 정리가 우선이므로 "best-effort"로만 수행
  try {
    await client.get(endpoints.auth.logout);
  } catch {
    // ignore
  }
}

const remoteApi: AuthApi = {
  /**
   * 유저 조회
   * - userId는 서버 명세상 문자열이며, 본 앱에선 loginId와 동일하게 취급
   */
  async getUserByLoginId(loginId: string): Promise<User | null> {
    try {
      const res = await client.get<ApiUserProfileResponse>(endpoints.users.profile(loginId));
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
   *
   * 왜 fallback?:
   * - exists API가 간헐적으로 실패하는 경우, profile 조회로 한 번 더 확인하면
   *   "중복 가입" 같은 치명적인 실수를 줄일 수 있음
   */
  async checkLoginIdAvailability(loginId: string): Promise<boolean> {
    try {
      const res = await client.get<ExistsResponse>(endpoints.users.exists(loginId));
      return mapExistsResponseToAvailability(res.data);
    } catch {
      try {
        const user = await remoteApi.getUserByLoginId(loginId);
        return user == null;
      } catch {
        // 최종 실패 시 보수적으로 "사용 불가" 처리(중복 가입 방지)
        return false;
      }
    }
  },

  /**
   * 회원가입
   * - OpenAPI SignupRequest에는 nickname이 없어 서버 정책에 따라 별도 API가 필요할 수 있음
   * - 가입 직후 profile을 다시 읽어오는 이유:
   *   서버가 일부 필드를 서버단 기본값으로 보정/가공하는 경우가 많아 UI 안정성이 좋아짐
   */
  async signup(input: SignupInput): Promise<User> {
    const body = mapSignupInputToSignupRequest(input);

    try {
      await client.post(endpoints.users.signup, body, { headers: JSON_HEADERS });

      const user = await remoteApi.getUserByLoginId(input.loginId);
      if (user) return user;

      // profile 조회가 실패/미구현이어도 앱 진행을 막지 않기 위한 최소값(정책)
      return {
        id: input.loginId,
        loginId: input.loginId,
        nickname: input.nickname,
        gender: input.gender,
        birthDate: input.birthDate,
        avatarUrl: null,
      };
    } catch (e) {
      throw new Error(toErrorMessage(e));
    }
  },

  /**
   * 로그인
   * - 토큰 저장 → 세션(loginId) 저장 → 유저 프로필 로딩
   * - 프로필 로딩이 실패하면(서버 불안정) "로그인은 됐는데 앱은 비로그인" 같은 어긋남이 생기므로
   *   세션을 정리하고 에러로 처리(일관성 우선)
   */
  async login(input: LoginInput): Promise<User> {
    try {
      const req = mapLoginInputToLoginRequest(input);

      const res = await client.post<TokenResponse>(endpoints.auth.login, req, {
        headers: JSON_HEADERS,
      });

      const tokens = mapTokenResponseToTokens(res.data);
      await setAuthTokens(tokens);

      // 현재 로그인 아이디(=userId) 저장
      await setCurrentUserId(input.loginId);

      const user = await remoteApi.getUserByLoginId(input.loginId);
      if (!user) {
        // 토큰만 남기면 hydrate/store가 "로그인"으로 오판할 수 있으니 세션 정리
        await clearAuthTokens();
        throw new Error("회원 정보를 불러올 수 없습니다.");
      }

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
    await setCurrentUserId(loginId);
  },

  async clearCurrentLoginId(): Promise<void> {
    await safeLogoutOnServer();
    // clearAuthTokens()는 tokens + currentUserId까지 정리(=세션 정리)
    await clearAuthTokens();
  },
};

export default remoteApi;
export { remoteApi as authApi };