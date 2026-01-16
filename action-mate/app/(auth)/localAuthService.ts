// src/features/auth/localAuthService.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User } from "@/features/auth/authStore";

type StoredUser = User & { password: string };

type ResetRecord = {
  code: string;
  expiresAt: number; // ms epoch
};

const USERS_KEY = "am_local_users_v1";
const CURRENT_EMAIL_KEY = "am_current_email_v1";
const RESET_KEY = "am_pw_reset_v1";

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

async function writeJSON<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function genId() {
  return `local_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function genCode6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ----------------------------
// Users
// ----------------------------
export async function listUsers(): Promise<StoredUser[]> {
  return readJSON<StoredUser[]>(USERS_KEY, []);
}

async function saveUsers(users: StoredUser[]) {
  await writeJSON(USERS_KEY, users);
}

export async function getStoredUserByEmail(email: string): Promise<StoredUser | null> {
  const users = await listUsers();
  const e = normEmail(email);
  return users.find((u) => normEmail(u.email) === e) ?? null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const u = await getStoredUserByEmail(email);
  if (!u) return null;
  // password 제외
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...user } = u;
  return user;
}

export async function createUser(params: {
  email: string;
  nickname: string;
  password: string;
  gender: User["gender"];
  birthDate: string; // "YYYY-MM-DD" or ""
}): Promise<User> {
  const users = await listUsers();
  const e = normEmail(params.email);

  const exists = users.some((u) => normEmail(u.email) === e);
  if (exists) throw new Error("이미 가입된 이메일입니다.");

  const user: User = {
    id: genId(),
    email: params.email.trim(),
    nickname: params.nickname.trim(),
    gender: params.gender,
    birthDate: params.birthDate,
  };

  const stored: StoredUser = { ...user, password: params.password };

  await saveUsers([stored, ...users]);
  return user;
}

export async function verifyLogin(email: string, password: string): Promise<User> {
  const stored = await getStoredUserByEmail(email);
  if (!stored) throw new Error("가입된 이메일이 없어요.");
  if (stored.password !== password) throw new Error("비밀번호가 올바르지 않아요.");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _pw, ...user } = stored;
  return user;
}

export async function updatePassword(email: string, newPassword: string): Promise<void> {
  const users = await listUsers();
  const e = normEmail(email);
  const idx = users.findIndex((u) => normEmail(u.email) === e);
  if (idx < 0) throw new Error("가입된 이메일이 없어요.");

  users[idx] = { ...users[idx], password: newPassword };
  await saveUsers(users);
}

// ----------------------------
// Current login (for hydrate)
// ----------------------------
export async function setCurrentUserEmail(email: string) {
  await AsyncStorage.setItem(CURRENT_EMAIL_KEY, normEmail(email));
}

export async function getCurrentUserEmail(): Promise<string | null> {
  const v = await AsyncStorage.getItem(CURRENT_EMAIL_KEY);
  return v ? v : null;
}

export async function clearCurrentUserEmail() {
  await AsyncStorage.removeItem(CURRENT_EMAIL_KEY);
}

// ----------------------------
// Password reset codes (mock)
// ----------------------------
export async function requestPasswordReset(email: string): Promise<ResetRecord> {
  const user = await getStoredUserByEmail(email);
  if (!user) throw new Error("가입된 이메일이 없어요.");

  const code = genCode6();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10분

  const all = await readJSON<Record<string, ResetRecord>>(RESET_KEY, {});
  all[normEmail(email)] = { code, expiresAt };
  await writeJSON(RESET_KEY, all);

  return { code, expiresAt };
}

export async function verifyPasswordResetCode(email: string, code: string): Promise<void> {
  const all = await readJSON<Record<string, ResetRecord>>(RESET_KEY, {});
  const rec = all[normEmail(email)];
  if (!rec) throw new Error("인증코드를 다시 요청해 주세요.");
  if (Date.now() > rec.expiresAt) throw new Error("인증코드가 만료됐어요. 다시 요청해 주세요.");
  if (rec.code !== code.trim()) throw new Error("인증코드가 올바르지 않아요.");
}

export async function consumePasswordResetCode(email: string): Promise<void> {
  const all = await readJSON<Record<string, ResetRecord>>(RESET_KEY, {});
  delete all[normEmail(email)];
  await writeJSON(RESET_KEY, all);
}
