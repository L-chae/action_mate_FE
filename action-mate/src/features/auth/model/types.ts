// src/features/auth/model/types.ts
import type { Gender as SharedGender, ISODateString, Id, UserSummary } from "@/shared/model/types";

export type Gender = SharedGender;

export type BirthDateString = ISODateString | "";

export type User = UserSummary & {
  loginId: string;
  gender: Gender;
  birthDate: BirthDateString;

  /**
   * UI 편의 필드(선택):
   * - 서버는 보통 profileImageName(파일명)을 주고, mapper에서 URL로 변환해 넣습니다.
   * - 이미지 업로드가 없는 경우 file:// URI는 서버에 반영되지 않도록 mapper에서 자동 제외합니다.
   */
  avatarUrl?: string | null;
};

export type SignupInput = {
  loginId: string;
  password: string;
  nickname: string;
  gender: Gender;
  birthDate: BirthDateString;
};

export type LoginInput = {
  loginId: string;
  password: string;
};

export type ResetRequestResult = { code?: string };

export type AuthApi = {
  checkLoginIdAvailability(loginId: string): Promise<boolean>;
  getUserByLoginId(loginId: string): Promise<User | null>;

  // OpenAPI v1.2.4: /users 회원가입(201) 응답 바디 없음
  signup(input: SignupInput): Promise<void>;

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
