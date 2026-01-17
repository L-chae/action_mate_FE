// src/features/auth/api/authApi.local.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User, Gender, ResetRequestResult } from "@/features/auth/model/types";
import { setAccessToken, clearAuthTokens } from "@/shared/api/authToken";

// ⚠️ 데모/목업용: 비밀번호 평문 저장 (실서비스 금지)

type StoredUser = User & { password: string };

const KEY_USERS = "localAuth:users";
const KEY_CURRENT_EMAIL = "localAuth:currentEmail";
const KEY_RESET_CODES = "localAuth:resetCodes"; // { [email]: { code, expiresAt } }

function normEmail(email: string) {
  return email.trim().toLowerCase();
}

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJSON(key: string, value: any) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// ---------------------
// ✅ Session (authStore가 쓰는 핵심 2개)
// ---------------------
export async function persistSession(user: User): Promise<void> {
  // 목업 토큰 저장
  await setAccessToken(`mock.${Date.now()}`);
  // 마지막 로그인 이메일 저장 (hydrate용)
  await setCurrentUserEmail(user.email);
}

export async function clearSession(): Promise<void> {
  await clearAuthTokens();
  await clearCurrentUserEmail();
}

// ---------------------
// ✅ (선택) 목업 계정 시드: 개발 중 "로그인 테스트" 편하게
// ---------------------
export async function seedMockUsers(): Promise<void> {
  const users = await readJSON<StoredUser[]>(KEY_USERS, []);
  if (users.length > 0) return; // 이미 있으면 건드리지 않음

  const demo: StoredUser[] = [
    {
      id: "user",
      email: "test@test.com",
      nickname: "테스트유저",
      gender: "none",
      birthDate: "2000-01-01",
      password: "11112222",
    },
  ];

  await writeJSON(KEY_USERS, demo);
}

// ---------------------
// Users
// ---------------------
export async function getUserByEmail(email: string): Promise<User | null> {
  const e = normEmail(email);
  const users = await readJSON<StoredUser[]>(KEY_USERS, []);
  const found = users.find((u) => normEmail(u.email) === e);
  if (!found) return null;
  const { password: _pw, ...user } = found;
  return user;
}

export async function createUser(input: {
  email: string;
  nickname: string;
  password: string;
  gender: Gender;
  birthDate: string;
}): Promise<User> {
  const email = normEmail(input.email);
  const nickname = input.nickname.trim();

  if (!email) throw new Error("이메일을 입력해 주세요.");
  if (!nickname) throw new Error("닉네임을 입력해 주세요.");
  if (input.password.length < 8) throw new Error("비밀번호는 8자 이상으로 입력해 주세요.");

  const users = await readJSON<StoredUser[]>(KEY_USERS, []);
  const exists = users.some((u) => normEmail(u.email) === email);
  if (exists) throw new Error("이미 가입된 이메일이에요.");

  const user: User = {
    id: `u_${Date.now()}`,
    email,
    nickname,
    gender: input.gender ?? "none",
    birthDate: input.birthDate ?? "",
  };

  const stored: StoredUser = { ...user, password: input.password };
  await writeJSON(KEY_USERS, [...users, stored]);

  return user;
}

export async function verifyLogin(email: string, password: string): Promise<User> {
  const e = normEmail(email);
  const users = await readJSON<StoredUser[]>(KEY_USERS, []);
  const found = users.find((u) => normEmail(u.email) === e);
  if (!found) throw new Error("가입되지 않은 이메일이에요.");
  if (found.password !== password) throw new Error("비밀번호가 올바르지 않아요.");

  const { password: _pw, ...user } = found;
  return user;
}

export async function updatePassword(email: string, newPassword: string): Promise<void> {
  const e = normEmail(email);
  if (newPassword.length < 8) throw new Error("비밀번호는 8자 이상으로 입력해 주세요.");

  const users = await readJSON<StoredUser[]>(KEY_USERS, []);
  const idx = users.findIndex((u) => normEmail(u.email) === e);
  if (idx < 0) throw new Error("가입되지 않은 이메일이에요.");

  const next = [...users];
  next[idx] = { ...next[idx], password: newPassword };
  await writeJSON(KEY_USERS, next);
}

// ---------------------
// current user email
// ---------------------
export async function getCurrentUserEmail(): Promise<string | null> {
  const v = await AsyncStorage.getItem(KEY_CURRENT_EMAIL);
  return v ? v : null;
}

export async function setCurrentUserEmail(email: string): Promise<void> {
  await AsyncStorage.setItem(KEY_CURRENT_EMAIL, normEmail(email));
}

export async function clearCurrentUserEmail(): Promise<void> {
  await AsyncStorage.removeItem(KEY_CURRENT_EMAIL);
}

// ---------------------
// password reset codes
// ---------------------
type ResetMap = Record<string, { code: string; expiresAt: number }>;

export async function requestPasswordReset(email: string): Promise<ResetRequestResult> {
  const e = normEmail(email);

  const user = await getUserByEmail(e);
  if (!user) throw new Error("가입되지 않은 이메일이에요.");

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10분

  const map = await readJSON<ResetMap>(KEY_RESET_CODES, {});
  map[e] = { code, expiresAt };
  await writeJSON(KEY_RESET_CODES, map);

  return { code };
}

export async function verifyPasswordResetCode(email: string, code: string): Promise<void> {
  const e = normEmail(email);
  const map = await readJSON<ResetMap>(KEY_RESET_CODES, {});
  const item = map[e];
  if (!item) throw new Error("인증코드를 다시 요청해 주세요.");
  if (Date.now() > item.expiresAt) throw new Error("인증코드가 만료됐어요. 다시 요청해 주세요.");
  if (item.code !== code.trim()) throw new Error("인증코드가 올바르지 않아요.");
}

export async function consumePasswordResetCode(email: string): Promise<void> {
  const e = normEmail(email);
  const map = await readJSON<ResetMap>(KEY_RESET_CODES, {});
  if (map[e]) {
    delete map[e];
    await writeJSON(KEY_RESET_CODES, map);
  }
}