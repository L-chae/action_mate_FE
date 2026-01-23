// src/features/auth/api/authApi.local.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { User, SignupInput, LoginInput, AuthApi, ResetRequestResult } from "@/features/auth/model/types";
import { setAccessToken, clearAuthTokens } from "@/shared/api/authToken";

// ⚠️ 로컬 목업용: 비밀번호 평문 저장 (실서비스 금지)
type StoredUser = User & { password: string };

const KEY_USERS = "localAuth:users";
const KEY_CURRENT_LOGIN_ID = "localAuth:currentLoginId";

// ✅ 안전한 정규화 함수 (undefined가 들어와도 죽지 않음)
const normId = (id?: string) => (id || "").trim().toLowerCase();

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

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

// id 또는 loginId로 유저 찾기(실무에서 흔히 섞여 들어와도 안 깨지게)
function findUserIndexByIdOrLoginId(users: StoredUser[], idOrLoginId: string): number {
  const key = normId(idOrLoginId);
  if (!key) return -1;

  // 1) id 우선
  const byId = users.findIndex((u) => normId(u.id) === key);
  if (byId !== -1) return byId;

  // 2) loginId
  return users.findIndex((u) => u.loginId && normId(u.loginId) === key);
}

// ----------------------------------------------------------------------
// ✅ 1. 시드 데이터 (개발용 계정) + 데이터 마이그레이션
// ----------------------------------------------------------------------

export async function seedMockUsers(): Promise<void> {
  let users = await readJSON<StoredUser[]>(KEY_USERS, []);

  // 🚨 데이터 정합성 체크
  const isCorrupted = users.some((u) => !u.loginId);

  if (users.length === 0 || isCorrupted) {
    if (isCorrupted) {
      console.log("⚠️ 구버전 데이터가 감지되어 초기화합니다.");
    }

    const demo: StoredUser[] = [
      {
        id: "u_seed_01",
        loginId: "user01",
        nickname: "테니스왕",
        password: "1234",
        gender: "male",
        birthDate: "1995-06-15",
        avatarUrl: null,
      },
      {
        id: "u_seed_02",
        loginId: "rabbit99",
        nickname: "당근조아",
        password: "1234",
        gender: "female",
        birthDate: "1999-12-25",
        avatarUrl: null,
      },
    ];

    await writeJSON(KEY_USERS, demo);
  }
}

// ----------------------------------------------------------------------
// ✅ 2. AuthApi 구현
// ----------------------------------------------------------------------

const authApi: AuthApi = {
  /**
   * ✅ 아이디로 유저 조회
   */
  async getUserByLoginId(loginId: string): Promise<User | null> {
    const targetId = normId(loginId);
    const users = await readJSON<StoredUser[]>(KEY_USERS, []);

    const found = users.find((u) => u.loginId && normId(u.loginId) === targetId);

    if (!found) return null;
    const { password: _pw, ...user } = found;
    return user;
  },

  /**
   * ✅ 회원가입
   */
  async signup(input: SignupInput): Promise<User> {
    const loginId = normId(input.loginId);
    const nickname = input.nickname.trim();

    if (!loginId) throw new Error("아이디를 입력해주세요.");
    if (!nickname || nickname.length < 2) throw new Error("닉네임은 2글자 이상 입력해주세요.");
    if (input.password.length < 4) throw new Error("비밀번호는 4자 이상으로 입력해주세요.");
    if (!input.gender) throw new Error("성별을 선택해주세요.");
    if (!input.birthDate) throw new Error("생년월일을 입력해주세요.");

    const users = await readJSON<StoredUser[]>(KEY_USERS, []);

    if (users.some((u) => u.loginId && normId(u.loginId) === loginId)) {
      throw new Error("이미 사용 중인 아이디예요.");
    }

    const newUser: User = {
      id: `u_${Date.now()}`,
      loginId,
      nickname,
      gender: input.gender,
      birthDate: input.birthDate,
      avatarUrl: null,
    };

    await writeJSON(KEY_USERS, [...users, { ...newUser, password: input.password }]);
    return newUser;
  },

  /**
   * ✅ 로그인
   */
  async login(input: LoginInput): Promise<User> {
    const targetId = normId(input.loginId);
    const users = await readJSON<StoredUser[]>(KEY_USERS, []);

    const found = users.find((u) => u.loginId && normId(u.loginId) === targetId);

    if (!found) throw new Error("존재하지 않는 아이디예요.");
    if (found.password !== input.password) {
      throw new Error("비밀번호가 일치하지 않아요.");
    }

    const { password: _pw, ...user } = found;

    await setAccessToken(`mock_token_${Date.now()}`);
    await authApi.setCurrentLoginId(user.loginId);

    return user;
  },

  /**
   * ✅ 유저 정보 수정
   * - 실무에서 호출자가 id/loginId를 섞어 보내도 동작하도록 방어적으로 구현합니다.
   */
  async updateUser(id: string, patch: Partial<User>): Promise<User> {
    const users = await readJSON<StoredUser[]>(KEY_USERS, []);
    const idx = findUserIndexByIdOrLoginId(users, id);

    if (idx === -1) {
      throw new Error("사용자를 찾을 수 없습니다.");
    }

    const existing = users[idx];

    // loginId / id 같은 식별자는 실수로 덮어쓰지 않게 제한(원하면 풀어도 됨)
    const { id: _id, loginId: _loginId, password: _pw, ...rest } = patch as any;

    const updated: StoredUser = {
      ...existing,
      ...rest,
      password: existing.password,
      id: existing.id,
      loginId: existing.loginId,
    };

    users[idx] = updated;
    await writeJSON(KEY_USERS, users);

    const { password: __pw, ...safeUser } = updated;
    return safeUser;
  },

  async updatePassword(loginId: string, newPassword: string): Promise<void> {
    const users = await readJSON<StoredUser[]>(KEY_USERS, []);
    const idx = findUserIndexByIdOrLoginId(users, loginId);
    if (idx === -1) throw new Error("사용자를 찾을 수 없습니다.");

    users[idx].password = newPassword;
    await writeJSON(KEY_USERS, users);
  },

  async requestPasswordReset(loginId: string): Promise<ResetRequestResult> {
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
  // Session
  // ----------------------------------------------------------------------

  async getCurrentLoginId(): Promise<string | null> {
    return await AsyncStorage.getItem(KEY_CURRENT_LOGIN_ID);
  },

  async setCurrentLoginId(loginId: string): Promise<void> {
    await AsyncStorage.setItem(KEY_CURRENT_LOGIN_ID, normId(loginId));
  },

  async clearCurrentLoginId(): Promise<void> {
    await AsyncStorage.removeItem(KEY_CURRENT_LOGIN_ID);
    await clearAuthTokens();
  },
};

export { authApi };
export default authApi;