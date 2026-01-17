//서버 구현(나중에 axios로)
// src/features/auth/api/authApi.remote.ts
import type { User, Gender, ResetRequestResult } from "@/features/auth/model/types";

// 나중에 axios 붙일 자리. 지금은 구현 안 했다는 걸 명확히 에러로.
function notReady(): never {
  throw new Error("authApi.remote는 아직 연결되지 않았어요.");
}

export async function getUserByEmail(_email: string): Promise<User | null> {
  return notReady();
}
export async function createUser(_input: {
  email: string; nickname: string; password: string; gender: Gender; birthDate: string;
}): Promise<User> {
  return notReady();
}
export async function verifyLogin(_email: string, _password: string): Promise<User> {
  return notReady();
}
export async function updatePassword(_email: string, _newPassword: string): Promise<void> {
  return notReady();
}

export async function requestPasswordReset(_email: string): Promise<ResetRequestResult> {
  return notReady();
}
export async function verifyPasswordResetCode(_email: string, _code: string): Promise<void> {
  return notReady();
}
export async function consumePasswordResetCode(_email: string): Promise<void> {
  return notReady();
}

export async function getCurrentUserEmail(): Promise<string | null> {
  return notReady();
}
export async function setCurrentUserEmail(_email: string): Promise<void> {
  return notReady();
}
export async function clearCurrentUserEmail(): Promise<void> {
  return notReady();
}