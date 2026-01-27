// src/features/auth/model/authStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { authApi, MOCK_AUTO_LOGIN_CREDENTIALS, USE_MOCK_AUTO_LOGIN } from "@/features/auth/api/authApi";
import {
  clearAuthTokens,
  getAccessToken,
  getCurrentUserId,
  getRefreshToken,
  setCurrentUserId,
} from "@/shared/api/authToken";
import type { User } from "./types";

type AuthState = {
  hasHydrated: boolean;
  isLoggedIn: boolean;
  user: User | null;

  hydrateFromStorage: () => Promise<void>;

  /** LoginScreen에서 authApi.login 성공 후 호출 */
  login: (user: User) => void;

  /** 프로필 화면 등에서 즉시 UI 반영용 */
  setUser: (user: User | null) => void;

  logout: () => Promise<void>;

  /** 프로필 업데이트 */
  updateProfile: (patch: Partial<User>) => Promise<void>;
};

const AUTH_USER_STORAGE_KEY = "auth.user.v1";

function sanitizeUserPatch(patch: Partial<User>): Partial<User> {
  const next: Partial<User> = { ...(patch ?? {}) };
  delete (next as any).id;
  delete (next as any).loginId;
  return next;
}

function normalizeLoginId(v: unknown): string {
  return String(v ?? "").trim();
}

function isUserLike(v: unknown): v is User {
  const o = v as any;
  return !!o && typeof o === "object" && typeof o.loginId === "string" && o.loginId.trim().length > 0;
}

function normalizeUser(u: unknown): User | null {
  if (!isUserLike(u)) return null;
  const loginId = normalizeLoginId((u as any)?.loginId);
  const id = normalizeLoginId((u as any)?.id ?? loginId) || loginId;
  if (!loginId) return null;

  return {
    ...(u as User),
    id,
    loginId,
    nickname: normalizeLoginId((u as any)?.nickname) || "알 수 없음",
    gender: (u as any)?.gender ?? "male",
    birthDate: String((u as any)?.birthDate ?? ""),
    avatarUrl: (u as any)?.avatarUrl ?? null,
    avatarImageName: (u as any)?.avatarImageName ?? null,
  };
}

async function loadStoredUser(): Promise<User | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    const normalized = normalizeUser(parsed);

    if (!normalized) {
      await AsyncStorage.removeItem(AUTH_USER_STORAGE_KEY);
      return null;
    }

    return normalized;
  } catch {
    await AsyncStorage.removeItem(AUTH_USER_STORAGE_KEY).catch(() => undefined);
    return null;
  }
}

async function persistUser(user: User | null): Promise<void> {
  try {
    if (!user) {
      await AsyncStorage.removeItem(AUTH_USER_STORAGE_KEY);
      return;
    }

    const normalized = normalizeUser(user);
    if (!normalized?.loginId) return;

    await AsyncStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // ignore
  }
}

async function resetSessionSafely(): Promise<void> {
  await Promise.allSettled([
    clearAuthTokens(),
    AsyncStorage.removeItem(AUTH_USER_STORAGE_KEY),
    authApi.clearCurrentLoginId().catch(() => undefined),
  ]);
}

async function persistLoginId(loginId: string): Promise<void> {
  const safeLoginId = normalizeLoginId(loginId);
  if (!safeLoginId) return;

  await Promise.allSettled([
    setCurrentUserId(safeLoginId),
    authApi.setCurrentLoginId(safeLoginId).catch(() => undefined), // legacy 호환
  ]);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  hasHydrated: false,
  isLoggedIn: false,
  user: null,

  hydrateFromStorage: async () => {
    try {
      const [storedUserId, legacyLoginId, accessToken, refreshToken, storedUser] = await Promise.all([
        getCurrentUserId(),
        authApi.getCurrentLoginId().catch(() => null),
        getAccessToken(),
        getRefreshToken(),
        loadStoredUser(),
      ]);

      const loginId =
        normalizeLoginId(storedUserId) ||
        normalizeLoginId(legacyLoginId) ||
        normalizeLoginId(storedUser?.loginId) ||
        "";

      const hasAccessToken = !!normalizeLoginId(accessToken);
      const hasRefreshToken = !!normalizeLoginId(refreshToken);

      // ✅ refresh는 서버 권한 불일치(403) 가능성이 커서 "accessToken 존재"를 로그인 조건으로 둠
      // - loginId만 있거나 refreshToken만 있는 상태는 불완전 세션으로 보고 정리
      if (!loginId || !hasAccessToken) {
        if (loginId || hasAccessToken || hasRefreshToken || storedUser) {
          await resetSessionSafely();
        }

        if (!loginId && USE_MOCK_AUTO_LOGIN) {
          await tryAutoMockLogin(set);
          return;
        }

        set({ hasHydrated: true, isLoggedIn: false, user: null });
        return;
      }

      // ✅ 저장된 user가 있으면 네트워크 없이 바로 복구
      if (storedUser) {
        const normalized = normalizeUser(storedUser);
        if (normalized) {
          await Promise.allSettled([persistLoginId(normalized.loginId), persistUser(normalized)]);
          set({ hasHydrated: true, isLoggedIn: true, user: normalized });
          return;
        }
      }

      // ✅ 레거시(예: user 미저장) 대비: 1회만 서버 조회로 채우고 이후부터 저장
      const fetchedUser = await authApi.getUserByLoginId(loginId);
      const normalizedFetched = normalizeUser(fetchedUser);

      if (!normalizedFetched) {
        await resetSessionSafely();
        set({ hasHydrated: true, isLoggedIn: false, user: null });
        return;
      }

      await Promise.allSettled([persistLoginId(normalizedFetched.loginId), persistUser(normalizedFetched)]);
      set({ hasHydrated: true, isLoggedIn: true, user: normalizedFetched });
    } catch {
      await resetSessionSafely();
      set({ hasHydrated: true, isLoggedIn: false, user: null });
    }
  },

  login: (user: User) => {
    const nextUser = normalizeUser(user);
    if (!nextUser?.loginId) {
      set({ isLoggedIn: false, user: null });
      persistUser(null).catch(() => undefined);
      return;
    }

    set({ isLoggedIn: true, user: nextUser });

    Promise.allSettled([persistLoginId(nextUser.loginId), persistUser(nextUser)]).catch(() => undefined);
  },

  setUser: (user: User | null) => {
    const next = user ? normalizeUser(user) : null;
    set({ user: next, isLoggedIn: !!next });
    persistUser(next).catch(() => undefined);
  },

  logout: async () => {
    await resetSessionSafely();
    set({ isLoggedIn: false, user: null });
  },

  updateProfile: async (patch: Partial<User>) => {
    const currentUser = get().user;
    if (!currentUser) return;

    const safePatch = sanitizeUserPatch(patch);
    const optimisticUser = normalizeUser({ ...currentUser, ...safePatch }) ?? currentUser;

    // 1) 낙관적 업데이트
    set({ user: optimisticUser });
    persistUser(optimisticUser).catch(() => undefined);

    try {
      // 2) 서버 반영(remote는 /users/update multipart 구현)
      const updatedUser = await authApi.updateUser(currentUser.loginId, safePatch);
      const normalizedUpdated = normalizeUser(updatedUser) ?? updatedUser;

      // 3) 확정 저장
      set({ user: normalizedUpdated });
      await Promise.allSettled([persistLoginId((normalizedUpdated as any)?.loginId ?? ""), persistUser(normalizedUpdated)]);
    } catch (e) {
      // 4) 실패 시 롤백
      set({ user: currentUser });
      persistUser(currentUser).catch(() => undefined);
      throw e;
    }
  },
}));

async function tryAutoMockLogin(setState: (p: Partial<AuthState>) => void) {
  try {
    const user = await authApi.login({
      loginId: MOCK_AUTO_LOGIN_CREDENTIALS.loginId,
      password: MOCK_AUTO_LOGIN_CREDENTIALS.password,
    });

    const normalized = normalizeUser(user);
    await Promise.allSettled([persistLoginId(normalized?.loginId ?? ""), persistUser(normalized)]);

    setState({ hasHydrated: true, isLoggedIn: !!normalized, user: normalized });
  } catch {
    setState({ hasHydrated: true, isLoggedIn: false, user: null });
  }
}

/*
요약(3줄)
- refresh 403 가능성을 전제로, 하이드레이션 로그인 조건을 “loginId + accessToken”으로 강화(불완전 세션은 정리).
- 저장된 user는 런타임 가드/정규화 후 즉시 복구하고, 없으면 1회 서버 프로필 조회로 채워 저장.
- 프로필 업데이트는 낙관적 반영→서버 반영 실패 시 롤백으로 UI 안정성 유지.
*/