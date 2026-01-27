// src/features/auth/model/types.ts
import type { Gender as SharedGender, ISODateString, Id, UserSummary } from "@/shared/model/types";

/**
 * Auth 도메인 타입
 * - 서버 명세상 로그인 id === userId(subject)
 * - UI에서는 UserSummary 기반 User를 사용
 * - 서버 스키마/불안정성은 API 레이어(Mapper)에서 흡수
 */
export type Gender = SharedGender;

export type User = UserSummary & {
  loginId: string; // 로그인 아이디(서버 명세상 id가 loginId 역할)
  gender: Gender;
  birthDate: ISODateString; // "YYYY-MM-DD" (서버가 비워줄 수 있어도 string 수용)
};

export type SignupInput = {
  loginId: string;
  password: string;
  nickname: string;
  gender: Gender;
  birthDate: ISODateString;
};

export type LoginInput = {
  loginId: string;
  password: string;
};

export type ResetRequestResult = { code?: string };

export type AuthApi = {
  checkLoginIdAvailability(loginId: string): Promise<boolean>;
  getUserByLoginId(loginId: string): Promise<User | null>;
  signup(input: SignupInput): Promise<User>;
  login(input: LoginInput): Promise<User>;

  /**
   * API 호출 파라미터는 유연하게(Id 허용)
   * - remote: /users/update(multipart data+image) 지원
   * - local mock: 구현 유지
   */
  updateUser(id: Id, patch: Partial<User>): Promise<User>;

  updatePassword(loginId: string, newPassword: string): Promise<void>;
  requestPasswordReset(loginId: string): Promise<ResetRequestResult>;
  verifyPasswordResetCode(loginId: string, code: string): Promise<void>;
  consumePasswordResetCode(loginId: string): Promise<void>;

  getCurrentLoginId(): Promise<string | null>;
  setCurrentLoginId(loginId: string): Promise<void>;
  clearCurrentLoginId(): Promise<void>;
};

/*
요약(3줄)
- User는 “서버 userId(subject) === loginId” 전제를 명시하고 UI에서 안정적으로 쓰는 최소 필드만 유지.
- updateUser는 remote의 /users/update(multipart data+image)와 local mock 구현 모두를 수용하도록 Id 기반 시그니처 유지.
- 서버 스키마 혼재/예외는 mappers와 네트워크 레이어에서 흡수하도록 역할을 분리.
*/