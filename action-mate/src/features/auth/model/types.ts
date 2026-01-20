// src/features/auth/model/types.ts

/**
 * ✅ 정책 정리
 * - "email" 용어/필드 제거 → 전부 "loginId(아이디)"로 통일
 * - 회원가입 필수: loginId, password, nickname, gender, birthDate (5가지)
 * - 로그인 필수: loginId, password
 */

export type Gender = "male" | "female";

export type User = {
  id: string;
  loginId: string;   // ✅ 아이디
  nickname: string; //닉네임
  gender: Gender;    // ✅ 필수
  birthDate: string; // ✅ "YYYY-MM-DD"
};

export type ResetRequestResult = { code?: string };

export type SignupInput = {
  loginId: string;
  password: string;
  nickname: string;
  gender: Gender;
  birthDate: string; // "YYYY-MM-DD"
};

export type LoginInput = {
  loginId: string;
  password: string;
};

export type AuthApi = {
  getUserByLoginId(loginId: string): Promise<User | null>;

  // ✅ 회원가입
  signup(input: SignupInput): Promise<User>;

  // ✅ 로그인
  login(input: LoginInput): Promise<User>;

  // (선택) 비밀번호 변경/리셋
  updatePassword(loginId: string, newPassword: string): Promise<void>;
  requestPasswordReset(loginId: string): Promise<ResetRequestResult>;
  verifyPasswordResetCode(loginId: string, code: string): Promise<void>;
  consumePasswordResetCode(loginId: string): Promise<void>;

  // ✅ 세션(현재 로그인 아이디)
  getCurrentLoginId(): Promise<string | null>;
  setCurrentLoginId(loginId: string): Promise<void>;
  clearCurrentLoginId(): Promise<void>;
};
