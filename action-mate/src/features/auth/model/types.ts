// src/features/auth/model/types.ts
import type { Gender as SharedGender, ISODateString, Id, UserSummary } from "@/shared/model/types";

/**
 * 기존 import 경로/사용처 변경을 최소화하기 위해 auth에서도 Gender를 유지(재노출)합니다.
 * - 실제 정의는 shared에 있고, auth는 alias로만 제공합니다.
 */
export type Gender = SharedGender;

/**
 * UserSummary를 확장해 auth에서 필요한 상세 필드만 추가
 */
export type User = UserSummary & {
  loginId: string; // 로그인 아이디
  gender: Gender;
  birthDate: ISODateString; // "YYYY-MM-DD"
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
  updateUser(id: Id, patch: Partial<User>): Promise<User>;
  updatePassword(loginId: string, newPassword: string): Promise<void>;
  requestPasswordReset(loginId: string): Promise<ResetRequestResult>;
  verifyPasswordResetCode(loginId: string, code: string): Promise<void>;
  consumePasswordResetCode(loginId: string): Promise<void>;
  getCurrentLoginId(): Promise<string | null>;
  setCurrentLoginId(loginId: string): Promise<void>;
  clearCurrentLoginId(): Promise<void>;
};