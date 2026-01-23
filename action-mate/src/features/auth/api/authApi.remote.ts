import type { User, Gender, SignupInput, LoginInput, AuthApi, ResetRequestResult } from "@/features/auth/model/types";
import type { ServerProfile } from "@/shared/model/types"; // ✅ shared에서 ServerProfile 가져오기
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

// ----------------------------------------------------------------------
// ✅ Helpers: 변환 로직 (Frontend <-> Backend)
// ----------------------------------------------------------------------

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

// Frontend(male/female) -> Backend(남/여)
function toServerGender(g: Gender): "남" | "여" {
  return g === "male" ? "남" : "여";
}

// Backend(남/여) -> Frontend(male/female)
function toClientGender(g?: string): Gender {
  if (g === "남") return "male";
  if (g === "여") return "female";
  return "male"; // 기본값
}

// Server DTO -> Client Store Model 매핑
function mapProfileToUser(profile: ServerProfile): User {
  return {
    id: profile.id,
    loginId: profile.id, // 명세상 id가 loginId 역할
    nickname: profile.nickname,
    gender: toClientGender(profile.gender), // "남"|"여" -> "male"|"female"
    birthDate: profile.birth || "2000-01-01",
    // ✅ 백엔드는 profileImageUrl, 프론트 모델은 avatarUrl 사용
    avatarUrl: profile.profileImageUrl ?? null, 
  };
}

// ----------------------------------------------------------------------
// ✅ API Implementation
// ----------------------------------------------------------------------

const remoteApi: AuthApi = {
  // 1. 유저 정보 조회
  async getUserByLoginId(loginId: string): Promise<User | null> {
    try {
      const res = await client.get<ServerProfile>(endpoints.users.profile(loginId));
      return mapProfileToUser(res.data);
    } catch (e: any) {
      const status = e?.response?.status;
      // 404면 유저가 없는 것이므로 null 반환
      if (status === 404) return null;
      throw new Error(toErrorMessage(e));
    }
  },

  // 2. 아이디 중복 확인
  async checkLoginIdAvailability(loginId: string): Promise<boolean> {
    try {
      // endpoints.users.exists API가 있다면 사용 (명세에 있었음)
      const res = await client.get<boolean>(endpoints.users.exists(loginId));
      // exists: true 면 중복(사용불가) -> false 반환
      return res.data; 
    } catch (e) {
      // API 호출 실패 시, 안전하게 "사용 불가" 처리하거나
      // 프로필 조회 방식(getUserByLoginId)으로 fallback 할 수 있음
      console.error("Check ID Error:", e);
      return false;
    }
  },

  // 3. 회원가입
  async signup(input: SignupInput): Promise<User> {
    const body = {
      id: input.loginId,
      password: input.password,
      birth: input.birthDate,
      gender: toServerGender(input.gender), // ✅ "male" -> "남" 변환 전송
    };

    try {
      await client.post(endpoints.users.signup, body, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      // 성공 시 바로 로그인 처리를 위해 User 객체 반환
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

  // 4. 로그인
  async login(input: LoginInput): Promise<User> {
    try {
      const res = await client.post<TokenResponse>(
        endpoints.auth.login,
        {
          id: input.loginId,
          password: input.password,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const tokens = res.data;
      if (!tokens?.accessToken) {
        throw new Error("토큰 응답이 올바르지 않습니다.");
      }

      await setAccessToken(tokens.accessToken);
      // refreshToken이 있다면 저장
      if (tokens.refreshToken) {
        await setRefreshToken(tokens.refreshToken);
      }
      
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

  // --- 미구현 / 명세 없는 기능들 ---

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
    await clearCurrentUserId();
    await clearAuthTokens();
  },
};

export default remoteApi;
export { remoteApi as authApi };