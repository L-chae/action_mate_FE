// src/features/auth/api/authApi.remote.ts
import type { AxiosError } from "axios";
import type { User, SignupInput, LoginInput, AuthApi, ResetRequestResult } from "@/features/auth/model/types";
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
  clearCurrentUserId,
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
 * OpenAPI 기준 Remote AuthApi
 * - /auth/login -> TokenResponse
 * - /users/exists -> ExistsResponse { exists: boolean }
 * - /users/{userId}/profile -> UserProfile 응답
 *
 * 핵심: 변환 로직은 mapper로 단일화해서
 * 화면/스토어가 서버 스키마 변화에 덜 흔들리게 합니다.
 */

function toErrorMessage(e: unknown, fallback = "요청 처리 중 오류가 발생했습니다."): string {
  const ax = e as AxiosError;
  const data = ax?.response?.data;
  const { message } = mapErrorResponse(data as any);
  return message || fallback;
}

const remoteApi: AuthApi = {
  /**
   * 1) 유저 정보 조회
   * - 서버에서 userId는 문자열(id)입니다.
   */
  async getUserByLoginId(loginId: string): Promise<User | null> {
    try {
      const res = await client.get<ApiUserProfileResponse>(endpoints.users.profile(loginId));
      return mapUserProfileResponseToAuthUser(res.data);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404) return null;
      throw new Error(toErrorMessage(e));
    }
  },

  /**
   * 2) 아이디 중복 확인
   * - 서버: { exists: boolean }
   * - 프론트: availability(boolean) = !exists
   */
  async checkLoginIdAvailability(loginId: string): Promise<boolean> {
    try {
      const res = await client.get<ExistsResponse>(endpoints.users.exists(loginId));
      return mapExistsResponseToAvailability(res.data);
    } catch (e) {
      // 서버가 불안정할 수 있으니 fallback: 프로필 조회로 한 번 더 확인
      try {
        const user = await remoteApi.getUserByLoginId(loginId);
        return user == null;
      } catch {
        // 최종 실패 시 안전하게 "사용 불가"로 처리(중복 가입 방지)
        return false;
      }
    }
  },

  /**
   * 3) 회원가입
   * - OpenAPI SignupRequest에는 nickname이 없음(서버 정책에 따라 별도 API 필요)
   * - 성공 후 profile을 다시 조회해 UI 모델과 최대한 맞춥니다.
   */
  async signup(input: SignupInput): Promise<User> {
    const body = mapSignupInputToSignupRequest(input);

    try {
      await client.post(endpoints.users.signup, body, {
        headers: { "Content-Type": "application/json" },
      });

      // 서버가 nickname을 저장/반영하지 않는 경우가 있어도,
      // 가입 직후에는 최소한 profile을 다시 읽어오는 게 실서비스에서 덜 흔들립니다.
      const user = await remoteApi.getUserByLoginId(input.loginId);
      if (user) return user;

      // profile 조회가 실패/미구현이어도 앱이 진행되도록 최소 값 반환(정책)
      return {
        id: input.loginId,
        loginId: input.loginId,
        nickname: input.nickname,
        gender: input.gender,
        birthDate: input.birthDate,
        avatarUrl: null,
      };
    } catch (e: any) {
      throw new Error(toErrorMessage(e));
    }
  },

  /**
   * 4) 로그인
   */
  async login(input: LoginInput): Promise<User> {
    try {
      const req = mapLoginInputToLoginRequest(input);
      const res = await client.post<TokenResponse>(endpoints.auth.login, req, {
        headers: { "Content-Type": "application/json" },
      });

      const tokens = mapTokenResponseToTokens(res.data);
      await setAuthTokens(tokens);

      // 앱 내부 세션(현재 유저 id/loginId)
      await remoteApi.setCurrentLoginId(input.loginId);

      // 토큰 저장 후 유저 정보 로딩
      const user = await remoteApi.getUserByLoginId(input.loginId);
      if (!user) throw new Error("회원 정보를 불러올 수 없습니다.");
      return user;
    } catch (e: any) {
      const status = e?.response?.status;
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
    // 서버 로그아웃 엔드포인트가 있으므로 호출은 시도(실패해도 로컬 정리 우선)
    try {
      await client.get(endpoints.auth.logout);
    } catch {
      // ignore
    }

    await clearCurrentUserId();
    await clearAuthTokens();
  },
};

export default remoteApi;
export { remoteApi as authApi };