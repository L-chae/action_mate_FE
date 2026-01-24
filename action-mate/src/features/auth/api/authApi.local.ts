// src/features/auth/api/authApi.local.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User, SignupInput, LoginInput, AuthApi, ResetRequestResult } from "@/features/auth/model/types";
import type { Id } from "@/shared/model/types";
import {
  clearAuthTokens,
  getCurrentUserId,
  setAuthTokens,
  setCurrentUserId,
} from "@/shared/api/authToken";

/**
 * Local(Mock) AuthApi
 *
 * 설계 의도(왜 이렇게?):
 * - Remote/Local의 "세션 저장 위치"를 통일(SecureStore 기반 authToken.ts)
 *   → hydrate/로그아웃 로직이 환경에 따라 달라지는 문제를 제거
 * - Mock 계정의 id를 loginId와 동일하게 맞춰 서버 모델과 괴리를 줄임
 *
 * ⚠️ 로컬 목업은 개발 편의용이며 비밀번호 평문 저장(실서비스 금지)
 */

type StoredUser = User & { password: string };

const KEY_USERS = "localAuth:users";

// 비교용 정규화(대소문자/공백 혼재 방어)
const normKey = (v?: Id | string) => String(v ?? "").trim().toLowerCase();

let seedOncePromise: Promise<void> | null = null;

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJSON(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function findUserIndexByIdOrLoginId(users: StoredUser[], idOrLoginId: Id): number {
  const key = normKey(idOrLoginId);
  if (!key) return -1;

  // 1) id 우선
  const byId = users.findIndex((u) => normKey(u.id) === key);
  if (byId !== -1) return byId;

  // 2) loginId
  return users.findIndex((u) => normKey(u.loginId) === key);
}

/**
 * 개발용 시드 데이터
 * - "한 번만" 실행되도록 락을 둬서 동시에 여러 API가 불려도 중복 seed를 방지
 */
async function ensureSeeded(): Promise<void> {
  seedOncePromise =
    seedOncePromise ??
    (async () => {
      const users = await readJSON<StoredUser[]>(KEY_USERS, []);
      const isCorrupted = users.some((u) => !u.loginId);

      if (users.length === 0 || isCorrupted) {
        const demo: StoredUser[] = [
          {
            // ✅ 서버 모델과 동일: id === loginId
            id: "user01",
            loginId: "user01",
            nickname: "테니스왕",
            password: "1234",
            gender: "male",
            birthDate: "1995-06-15",
            avatarUrl: null,
          },
          {
            id: "test01",
            loginId: "test01",
            nickname: "당근조아",
            password: "1234",
            gender: "female",
            birthDate: "1999-12-25",
            avatarUrl: null,
          },
        ];

        await writeJSON(KEY_USERS, demo);
      }
    })();

  return seedOncePromise;
}

const authApi: AuthApi = {
  async getUserByLoginId(loginId: string): Promise<User | null> {
    await ensureSeeded();

    const target = normKey(loginId);
    const users = await readJSON<StoredUser[]>(KEY_USERS, []);
    const found = users.find((u) => normKey(u.loginId) === target);

    if (!found) return null;
    const { password: _pw, ...user } = found;
    return user;
  },

  async checkLoginIdAvailability(loginId: string): Promise<boolean> {
    await ensureSeeded();

    const target = normKey(loginId);
    const users = await readJSON<StoredUser[]>(KEY_USERS, []);
    const exists = users.some((u) => normKey(u.loginId) === target);
    return !exists;
  },

  async signup(input: SignupInput): Promise<User> {
    await ensureSeeded();

    const loginId = input.loginId.trim();
    const loginKey = normKey(loginId);
    const nickname = input.nickname.trim();

    if (!loginId) throw new Error("아이디를 입력해주세요.");
    if (!nickname || nickname.length < 2) throw new Error("닉네임은 2글자 이상 입력해주세요.");
    if (input.password.length < 4) throw new Error("비밀번호는 4자 이상으로 입력해주세요.");
    if (!input.gender) throw new Error("성별을 선택해주세요.");
    if (!input.birthDate) throw new Error("생년월일을 입력해주세요.");

    const users = await readJSON<StoredUser[]>(KEY_USERS, []);
    if (users.some((u) => normKey(u.loginId) === loginKey)) {
      throw new Error("이미 사용 중인 아이디예요.");
    }

    const newUser: User = {
      // ✅ 서버 모델과 일치: id === loginId (다른 기능과의 괴리 최소화)
      id: loginId,
      loginId,
      nickname,
      gender: input.gender,
      birthDate: input.birthDate,
      avatarUrl: null,
    };

    await writeJSON(KEY_USERS, [...users, { ...newUser, password: input.password }]);
    return newUser;
  },

  async login(input: LoginInput): Promise<User> {
    await ensureSeeded();

    const target = normKey(input.loginId);
    const users = await readJSON<StoredUser[]>(KEY_USERS, []);
    const found = users.find((u) => normKey(u.loginId) === target);

    if (!found) throw new Error("존재하지 않는 아이디예요.");
    if (found.password !== input.password) throw new Error("비밀번호가 일치하지 않아요.");

    const { password: _pw, ...user } = found;

    // 왜 토큰을 저장?:
    // - mock 환경에서도 API 레이어/가드 로직이 동일하게 동작하도록 최소한의 토큰을 제공
    await Promise.all([
      setAuthTokens({
        accessToken: `mock_access_${Date.now()}`,
        refreshToken: `mock_refresh_${Date.now()}`,
      }),
      setCurrentUserId(user.loginId),
    ]);

    return user;
  },

  async updateUser(id: Id, patch: Partial<User>): Promise<User> {
    await ensureSeeded();

    const users = await readJSON<StoredUser[]>(KEY_USERS, []);
    const idx = findUserIndexByIdOrLoginId(users, id);

    if (idx === -1) throw new Error("사용자를 찾을 수 없습니다.");

    const existing = users[idx];

    // 왜 막나?:
    // - id/loginId는 세션/관계키로 쓰이는 경우가 많아서 변경 허용 시 데이터 정합성이 쉽게 깨짐
    const sanitizedPatch: Partial<User> = { ...patch };
    delete (sanitizedPatch as any).id;
    delete (sanitizedPatch as any).loginId;

    const updated: StoredUser = {
      ...existing,
      ...sanitizedPatch,
      id: existing.id,
      loginId: existing.loginId,
      password: existing.password,
    };

    users[idx] = updated;
    await writeJSON(KEY_USERS, users);

    const { password: __pw, ...safeUser } = updated;
    return safeUser;
  },

  async updatePassword(loginId: string, newPassword: string): Promise<void> {
    await ensureSeeded();

    if (!newPassword || newPassword.length < 4) throw new Error("비밀번호는 4자 이상으로 입력해주세요.");

    const users = await readJSON<StoredUser[]>(KEY_USERS, []);
    const idx = findUserIndexByIdOrLoginId(users, loginId);
    if (idx === -1) throw new Error("사용자를 찾을 수 없습니다.");

    users[idx].password = newPassword;
    await writeJSON(KEY_USERS, users);
  },

  async requestPasswordReset(loginId: string): Promise<ResetRequestResult> {
    await ensureSeeded();

    const user = await authApi.getUserByLoginId(loginId);
    if (!user) throw new Error("가입되지 않은 아이디입니다.");
    return { code: "123456" };
  },

  async verifyPasswordResetCode(_loginId: string, code: string): Promise<void> {
    if (code !== "123456") throw new Error("인증 코드가 올바르지 않습니다.");
  },

  async consumePasswordResetCode(_loginId: string): Promise<void> {
    return;
  },

  // ----------------------------------------------------------------------
  // Session (Remote와 동일한 저장소 사용)
  // ----------------------------------------------------------------------

  async getCurrentLoginId(): Promise<string | null> {
    return getCurrentUserId();
  },

  async setCurrentLoginId(loginId: string): Promise<void> {
    await setCurrentUserId(loginId);
  },

  async clearCurrentLoginId(): Promise<void> {
    // clearAuthTokens()는 tokens + currentUserId까지 정리(=세션 정리)
    await clearAuthTokens();
  },
};

export { authApi };
export default authApi;