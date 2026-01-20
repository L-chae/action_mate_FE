import type { User, Gender, ResetRequestResult } from "@/features/auth/model/types";
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

/**
 * 서버 공통 에러 스키마
 */
type ErrorResponse = {
  code: string;
  message: string;
};

/**
 * 명세 상 토큰 응답
 */
type TokenResponse = {
  accessToken: string;
  refreshToken: string;
};

/**
 * 명세 상 프로필 응답(UserProfile)
 */
type UserProfile = {
  id: string;
  birth?: string; // date
  gender?: "남" | "여";
  avgRate: number;
  orgTime: number;
};

function toErrorMessage(e: unknown): string {
  // axios 에러일 가능성이 높지만, 여기서는 의존을 최소화해 방어적으로 처리
  try {
    const anyE = e as any;
    const data = anyE?.response?.data as Partial<ErrorResponse> | undefined;
    if (data?.message) return data.message;
  } catch {
    // ignore
  }
  return "요청 처리 중 오류가 발생했습니다.";
}

/**
 * 프로젝트 기존 타입(User)이 어떤 형태인지 알 수 없으므로,
 * 최소한의 필드를 가진 객체를 만들고 필요 시 캐스팅합니다.
 * (실제 User 타입에 맞춰 점진적으로 정리하면 됨)
 */
function asUserMinimal(userId: string): User {
  return ({ email: userId, nickname: userId, id: userId } as unknown) as User;
}

/**
 * email 파라미터를 기존 코드 호환을 위해 유지하지만,
 * 서버 명세는 loginId(id)를 사용하므로 email === loginId 로 간주합니다.
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const userId = email;

  try {
    const res = await client.get<UserProfile>(endpoints.users.profile(userId));
    // 프로필을 User로 변환(프로젝트 User 타입에 맞게 추후 정교화 가능)
    const profile = res.data;
    return ({
      ...asUserMinimal(profile.id),
      birthDate: profile.birth,
      gender: profile.gender,
      avgRate: profile.avgRate,
      orgTime: profile.orgTime,
    } as unknown) as User;
  } catch (e: any) {
    const status = e?.response?.status;
    if (status === 404) return null;
    throw new Error(toErrorMessage(e));
  }
}

export async function createUser(input: {
  email: string; // 기존 호환: loginId로 매핑
  nickname: string; // 서버 명세에 없음(무시)
  password: string;
  gender: Gender;
  birthDate: string;
}): Promise<User> {
  const body = {
    id: input.email,
    password: input.password,
    // 명세: birth optional (date), gender optional ("남"|"여")
    birth: input.birthDate || undefined,
    gender: (input.gender as unknown) as "남" | "여" | undefined,
  };

  try {
    // 명세: 201 (바디 스키마 명시 없음) → 성공만 확인
    await client.post(endpoints.users.signup, body);

    // 회원가입 후 바로 User 객체 반환(필요 시 프로필 조회로 대체 가능)
    return asUserMinimal(input.email);
  } catch (e: any) {
    throw new Error(toErrorMessage(e));
  }
}

export async function verifyLogin(email: string, password: string): Promise<User> {
  const loginId = email;

  try {
    const res = await client.post<TokenResponse>(endpoints.auth.login, {
      id: loginId,
      password,
    });

    const tokens = res.data;
    if (!tokens?.accessToken || !tokens?.refreshToken) {
      throw new Error("토큰 응답이 올바르지 않습니다.");
    }

    // ✅ 로그인 성공 시 토큰 저장 + 현재 사용자 저장
    await setAccessToken(tokens.accessToken);
    await setRefreshToken(tokens.refreshToken);
    await setCurrentUserId(loginId);

    return asUserMinimal(loginId);
  } catch (e: any) {
    // 401: 로그인 실패
    const status = e?.response?.status;
    if (status === 401) {
      throw new Error("로그인에 실패했습니다.");
    }
    throw new Error(toErrorMessage(e));
  }
}

export async function updatePassword(_email: string, _newPassword: string): Promise<void> {
  // 서버 명세에 비밀번호 변경/재설정 API가 없음
  throw new Error("서버 명세에 비밀번호 변경 API가 없습니다.");
}

export async function requestPasswordReset(_email: string): Promise<ResetRequestResult> {
  // 서버 명세에 없음
  throw new Error("서버 명세에 비밀번호 재설정 API가 없습니다.");
}

export async function verifyPasswordResetCode(_email: string, _code: string): Promise<void> {
  // 서버 명세에 없음
  throw new Error("서버 명세에 비밀번호 재설정 API가 없습니다.");
}

export async function consumePasswordResetCode(_email: string): Promise<void> {
  // 서버 명세에 없음
  throw new Error("서버 명세에 비밀번호 재설정 API가 없습니다.");
}

export async function getCurrentUserEmail(): Promise<string | null> {
  // 기존 호환: email이라는 명칭이지만 실제로는 loginId 저장값을 반환
  return getCurrentUserId();
}

export async function setCurrentUserEmail(email: string): Promise<void> {
  // 기존 호환: email -> loginId
  await setCurrentUserId(email);
}

export async function clearCurrentUserEmail(): Promise<void> {
  await clearCurrentUserId();
  await clearAuthTokens();
}

/**
 * (옵션) 로그아웃이 필요한 경우 사용할 수 있는 헬퍼
 * - 명세: GET /auth/logout 성공 200
 */
export async function logout(): Promise<void> {
  try {
    await client.get(endpoints.auth.logout);
  } finally {
    await clearCurrentUserId();
    await clearAuthTokens();
  }
}
