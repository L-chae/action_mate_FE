import type {
  User,
  Gender,
  SignupInput,
  LoginInput,
  AuthApi,
  ResetRequestResult,
} from "@/features/auth/model/types";
import { client } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/api/endpoints";
import {
  setAccessToken,
  setRefreshToken,
  clearAuthTokens,
  setCurrentUserId, // 내부적으로 AsyncStorage key 관리
  getCurrentUserId,
  clearCurrentUserId,
} from "@/shared/api/authToken";

// ----------------------------------------------------------------------
// 서버 명세 타입 (Server DTO)
// ----------------------------------------------------------------------

type ErrorResponse = {
  code: string;
  message: string;
};

type TokenResponse = {
  accessToken: string;
  refreshToken: string;
};

// 서버에서는 id, birth, gender(한글) 등을 사용한다고 가정
type ServerProfile = {
  id: string; // loginId와 매핑
  birth?: string; // "YYYY-MM-DD"
  gender?: "남" | "여";
  nickname?: string; // 명세에 없다면 아래 매퍼에서 처리 필요
  avgRate?: number;
  orgTime?: number;
};

// ----------------------------------------------------------------------
// Helpers & Mappers
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

// Gender 변환: Client(male/female) <-> Server(남/여)
function toServerGender(g: Gender): "남" | "여" {
  return g === "male" ? "남" : "여";
}

function toClientGender(g?: string): Gender {
  if (g === "남") return "male";
  if (g === "여") return "female";
  return "male"; // 기본값 (혹은 에러 처리)
}

// Server Profile -> Client User 변환
function mapProfileToUser(profile: ServerProfile): User {
  return {
    id: profile.id, // DB PK가 따로 없다면 loginId 사용
    loginId: profile.id,
    // 서버에 닉네임 필드가 없다면 loginId로 대체하거나, 있다면 사용
    nickname: profile.nickname || profile.id,
    gender: toClientGender(profile.gender),
    birthDate: profile.birth || "1900-01-01",
  };
}

// ----------------------------------------------------------------------
// ✅ AuthApi Implementation
// ----------------------------------------------------------------------

const remoteApi: AuthApi = {
  /**
   * ✅ 아이디로 유저 조회
   */
  async getUserByLoginId(loginId: string): Promise<User | null> {
    try {
      const res = await client.get<ServerProfile>(
        endpoints.users.profile(loginId)
      );
      return mapProfileToUser(res.data);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404) return null;
      throw new Error(toErrorMessage(e));
    }
  },

  /**
   * ✅ 회원가입
   */
  async signup(input: SignupInput): Promise<User> {
    const body = {
      id: input.loginId,
      password: input.password,
      // 서버 명세가 nickname을 지원하지 않는다면 전송해도 무시될 수 있음.
      // 일단 보낸다고 가정 (혹은 제외)
      nickname: input.nickname,
      birth: input.birthDate,
      gender: toServerGender(input.gender),
    };

    try {
      // 명세: 201 Created
      await client.post(endpoints.users.signup, body);

      // 회원가입 성공 후 바로 객체 반환
      // (서버가 생성된 객체를 주지 않는다면 입력값 기반으로 구성)
      return {
        id: input.loginId,
        loginId: input.loginId,
        nickname: input.nickname,
        gender: input.gender,
        birthDate: input.birthDate,
      };
    } catch (e: any) {
      throw new Error(toErrorMessage(e));
    }
  },

  /**
   * ✅ 로그인
   */
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

      // 1. 토큰 저장
      await setAccessToken(tokens.accessToken);
      await setRefreshToken(tokens.refreshToken);
      
      // 2. 현재 사용자 ID(세션) 저장
      await remoteApi.setCurrentLoginId(input.loginId);

      // 3. 사용자 정보 조회 (로그인 응답에 프로필이 없다면 별도 조회)
      // 성능 최적화를 위해 여기서는 최소 정보만 리턴하고, 
      // 필요 시 메인 화면에서 fetchUser를 다시 하기도 함.
      // 여기서는 편의상 입력된 ID 기반으로 최소 객체 리턴 혹은 fetch
      const user = await remoteApi.getUserByLoginId(input.loginId);
      if (!user) throw new Error("회원 정보를 불러올 수 없습니다.");
      
      return user;
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) {
        throw new Error("아이디 또는 비밀번호가 일치하지 않습니다.");
      }
      throw new Error(toErrorMessage(e));
    }
  },

  /**
   * (미지원) 비밀번호 변경
   */
  async updatePassword(_loginId: string, _newPassword: string): Promise<void> {
    throw new Error("서버 명세에 비밀번호 변경 API가 없습니다.");
  },

  /**
   * (미지원) 비밀번호 리셋
   */
  async requestPasswordReset(_loginId: string): Promise<ResetRequestResult> {
    throw new Error("서버 명세에 비밀번호 재설정 API가 없습니다.");
  },

  async verifyPasswordResetCode(_loginId: string, _code: string): Promise<void> {
    throw new Error("서버 명세에 비밀번호 재설정 API가 없습니다.");
  },

  async consumePasswordResetCode(_loginId: string): Promise<void> {
    throw new Error("서버 명세에 비밀번호 재설정 API가 없습니다.");
  },

  // ----------------------------------------------------------------------
  // Session (현재 로그인 아이디)
  // ----------------------------------------------------------------------

  async getCurrentLoginId(): Promise<string | null> {
    return getCurrentUserId(); // 기존 authToken 내 함수 재사용
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