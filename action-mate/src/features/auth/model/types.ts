// src/features/auth/model/types.ts
export type Gender = "male" | "female" | "none";

export type User = {
  id: string;
  email: string;
  nickname: string;
  gender: Gender;
  birthDate: string; // ISO date "YYYY-MM-DD", 없으면 ""
};

export type ResetRequestResult = { code?: string };

export type CreateUserInput = {
  email: string;
  nickname: string;
  password: string;
  gender: Gender;
  birthDate: string; // "YYYY-MM-DD" | ""
};

export type AuthApi = {
  getUserByEmail(email: string): Promise<User | null>;
  createUser(input: CreateUserInput): Promise<User>;
  verifyLogin(email: string, password: string): Promise<User>;
  updatePassword(email: string, newPassword: string): Promise<void>;

  requestPasswordReset(email: string): Promise<ResetRequestResult>;
  verifyPasswordResetCode(email: string, code: string): Promise<void>;
  consumePasswordResetCode(email: string): Promise<void>;

  getCurrentUserEmail(): Promise<string | null>;
  setCurrentUserEmail(email: string): Promise<void>;
  clearCurrentUserEmail(): Promise<void>;
};