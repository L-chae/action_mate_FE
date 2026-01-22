import type { User, Gender, SignupInput, LoginInput, AuthApi, ResetRequestResult } from "@/features/auth/model/types";
import { client } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/api/endpoints";
import {
  setAccessToken,
  setRefreshToken,
  clearAuthTokens,
  setCurrentUserId,
  getCurrentUserId,
  clearCurrentUserId,
} from "@/shared/api/authToken";

type ErrorResponse = {
  code: string;
  message: string;
};

type TokenResponse = {
  accessToken: string;
  refreshToken: string;
};

// 서버 DTO(추정). 실제 명세에 맞게 조정
type ServerProfile = {
  id: string; // loginId와 매핑
  birth?: string; // "YYYY-MM-DD"
  gender?: "남" | "여";
  nickname?: string;
  avgRate?: number;
  orgTime?: number;
  avatarUrl?: string | null;
};

function toErrorMessage(e: unknown): string {
  try {
    const anyE = e as any;
    const data = anyE?.response?.data as Partial<ErrorResponse> | undefined;
    if (data?.message) return data.message;
  } catch {
    // ignore
  }
  return "요청 처리 중 오류가 발생했습니다.";
}

function toServerGender(g: Gender): "남" | "여" {
  return g === "male" ? "남" : "여";
}

function toClientGender(g?: string): Gender {
  if (g === "남") return "male";
  if (g === "여") return "female";
  return "male";
}

function mapProfileToUser(profile: ServerProfile): User {
  return {
    id: profile.id,
    loginId: profile.id,
    nickname: profile.nickname || profile.id,
    gender: toClientGender(profile.gender),
    birthDate: profile.birth || "2000-01-01",
    avatarUrl: profile.avatarUrl ?? null,
  };
}

const remoteApi: AuthApi = {
  async getUserByLoginId(loginId: string): Promise<User | null> {
    try {
      const res = await client.get<ServerProfile>(endpoints.users.profile(loginId));
      return mapProfileToUser(res.data);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404) return null;
      throw new Error(toErrorMessage(e));
    }
  },

  async signup(input: SignupInput): Promise<User> {
    const body = {
      id: input.loginId,
      password: input.password,
      birth: input.birthDate,
      gender: toServerGender(input.gender),
      // nickname: input.nickname, // 서버가 받지 않으면 제거 유지
    };

    try {
      await client.post(endpoints.users.signup, body);

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

  async login(input: LoginInput): Promise<User> {
    try {
      const res = await client.post<TokenResponse>(endpoints.auth.login, {
        id: input.loginId,
        password: input.password,
      });

      const tokens = res.data;
      if (!tokens?.accessToken || !tokens?.refreshToken) {
        throw new Error("토큰 응답이 올바르지 않습니다.");
      }

      await setAccessToken(tokens.accessToken);
      await setRefreshToken(tokens.refreshToken);
      await remoteApi.setCurrentLoginId(input.loginId);

      const user = await remoteApi.getUserByLoginId(input.loginId);
      if (!user) throw new Error("회원 정보를 불러올 수 없습니다.");
      return user;
    } catch (e: any) {
      const status = e?.response?.status;
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
    await setCurrentUserId(loginId);
  },

  async clearCurrentLoginId(): Promise<void> {
    await clearCurrentUserId();
    await clearAuthTokens();
  },
};

export default remoteApi;