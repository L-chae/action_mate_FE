import { UserSummary } from "@/shared/model/types"; 

export type Gender = "male" | "female";

// ✅ UserSummary를 상속받아 중복 제거
export type User = UserSummary & {
  loginId: string;   // 로그인 아이디
  gender: Gender;
  birthDate: string; // "YYYY-MM-DD"
  // id, nickname, avatarUrl은 UserSummary에서 옴
};

export type SignupInput = {
  loginId: string;
  password: string;
  nickname: string;
  gender: Gender;
  birthDate: string; 
};

export type LoginInput = {
  loginId: string;
  password: string;
};

export type ResetRequestResult = { code?: string };

export type AuthApi = {
  getUserByLoginId(loginId: string): Promise<User | null>;
  signup(input: SignupInput): Promise<User>;
  login(input: LoginInput): Promise<User>;
  updateUser(id: string, patch: Partial<User>): Promise<User>;
  updatePassword(loginId: string, newPassword: string): Promise<void>;
  requestPasswordReset(loginId: string): Promise<ResetRequestResult>;
  verifyPasswordResetCode(loginId: string, code: string): Promise<void>;
  consumePasswordResetCode(loginId: string): Promise<void>;
  getCurrentLoginId(): Promise<string | null>;
  setCurrentLoginId(loginId: string): Promise<void>;
  clearCurrentLoginId(): Promise<void>;
};