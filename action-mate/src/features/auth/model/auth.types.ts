// src/features/auth/model/auth.types.ts
export type Gender = "male" | "female" | "none";

export type User = {
  id: string;
  email: string;
  nickname: string;
  gender: Gender;
  birthDate: string; // "YYYY-MM-DD" | ""
};

export type CreateUserInput = {
  email: string;
  nickname: string;
  password: string;
  gender: Gender;
  birthDate: string; // "YYYY-MM-DD" | ""
};

export type PasswordResetRequestResult = { code: string }; // 목업용(DEV 표시)