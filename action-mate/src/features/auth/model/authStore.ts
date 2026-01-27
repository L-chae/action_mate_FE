// src/features/auth/model/authStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import {
  authApi,
  MOCK_AUTO_LOGIN_CREDENTIALS,
  USE_MOCK_AUTO_LOGIN,
} from "@/features/auth/api/authApi";
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
  const next: Partial<User> = { ...patch };
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

async function loadStoredUser(): Promise<User | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (!isUserLike(parsed)) {
      await AsyncStorage.removeItem(AUTH_USER_STORAGE_KEY);
      return null;
    }

    const safeLoginId = normalizeLoginId((parsed as any)?.loginId);
    const safeId = normalizeLoginId((parsed as any)?.id ?? safeLoginId) || safeLoginId;
    if (!safeLoginId) {
      await AsyncStorage.removeItem(AUTH_USER_STORAGE_KEY);
      return null;
    }

    return {
      ...(parsed as User),
      id: safeId,
      loginId: safeLoginId,
      nickname: normalizeLoginId((parsed as any)?.nickname) || "알 수 없음",
      gender: (parsed as any)?.gender ?? "male",
      birthDate: String((parsed as any)?.birthDate ?? ""),
      avatarUrl: (parsed as any)?.avatarUrl ?? null,
      avatarImageName: (parsed as any)?.avatarImageName ?? null,
    };
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
    const loginId = normalizeLoginId(user?.loginId);
    if (!loginId) return;

    const payload: User = {
      ...user,
      id: normalizeLoginId((user as any)?.id ?? loginId) || loginId,
      loginId,
      nickname: normalizeLoginId((user as any)?.nickname) || "알 수 없음",
      gender: (user as any)?.gender ?? "male",
      birthDate: String((user as any)?.birthDate ?? ""),
      avatarUrl: (user as any)?.avatarUrl ?? null,
      avatarImageName: (user as any)?.avatarImageName ?? null,
    };

    await AsyncStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

async function resetSessionSafely() {
  await Promise.allSettled([
    clearAuthTokens(),
    AsyncStorage.removeItem(AUTH_USER_STORAGE_KEY),
    authApi.clearCurrentLoginId().catch(() => undefined),
  ]);
}

async function persistLoginId(loginId: string) {
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
      const [storedUserId, legacyLoginId, accessToken, refreshToken, storedUser] =
        await Promise.all([
          getCurrentUserId(),
          authApi.getCurrentLoginId().catch(() => null),
          getAccessToken(),
          getRefreshToken(),
          loadStoredUser(),
        ]);

      const loginId = storedUserId ?? legacyLoginId ?? normalizeLoginId(storedUser?.loginId) ?? null;
      const hasAnyToken = !!accessToken || !!refreshToken;

      // 세션/토큰 조합이 깨진 경우를 먼저 정리
      if (!loginId || !hasAnyToken) {
        if (loginId || hasAnyToken) {
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
        await Promise.allSettled([persistLoginId(storedUser.loginId), persistUser(storedUser)]);
        set({ hasHydrated: true, isLoggedIn: true, user: storedUser });
        return;
      }

      // ✅ 레거시(예: user 미저장) 대비: 1회만 서버 조회로 채우고 이후부터 저장
      const fetchedUser = await authApi.getUserByLoginId(loginId);
      if (!fetchedUser) {
        await resetSessionSafely();
        set({ hasHydrated: true, isLoggedIn: false, user: null });
        return;
      }

      await Promise.allSettled([persistLoginId(fetchedUser.loginId), persistUser(fetchedUser)]);
      set({ hasHydrated: true, isLoggedIn: true, user: fetchedUser });
    } catch {
      await resetSessionSafely();
      set({ hasHydrated: true, isLoggedIn: false, user: null });
    }
  },

  login: (user: User) => {
    const nextUser: User | null = user ?? null;
    if (!nextUser?.loginId) {
      set({ isLoggedIn: false, user: null });
      persistUser(null).catch(() => undefined);
      return;
    }

    set({ isLoggedIn: true, user: nextUser });

    Promise.allSettled([persistLoginId(nextUser.loginId), persistUser(nextUser)]).catch(
      () => undefined,
    );
  },

  setUser: (user: User | null) => {
    set({ user, isLoggedIn: !!user });
    persistUser(user).catch(() => undefined);
  },

  logout: async () => {
    await resetSessionSafely();
    set({ isLoggedIn: false, user: null });
  },

  updateProfile: async (patch: Partial<User>) => {
    const currentUser = get().user;
    if (!currentUser) return;

    const safePatch = sanitizeUserPatch(patch);

    // 1) 낙관적 업데이트
    const optimisticUser: User = { ...currentUser, ...safePatch };
    set({ user: optimisticUser });
    persistUser(optimisticUser).catch(() => undefined);

    try {
      // 2) 서버 반영(서버 명세에 update 없음 → remote에서는 throw 가능)
      const updatedUser = await authApi.updateUser(currentUser.loginId, safePatch);

      // 3) 확정 저장
      set({ user: updatedUser });
      await Promise.allSettled([persistLoginId(updatedUser.loginId), persistUser(updatedUser)]);
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

    await Promise.allSettled([persistLoginId(user?.loginId ?? ""), persistUser(user ?? null)]);

    setState({ hasHydrated: true, isLoggedIn: true, user: user ?? null });
  } catch {
    setState({ hasHydrated: true, isLoggedIn: false, user: null });
  }
}

/**
 * 3줄 요약
 * - User를 AsyncStorage에 저장/복구하도록 추가해, 부팅 시 기본적으로 네트워크 조회 없이 로그인 상태를 복원합니다.
 * - 레거시(유저 미저장) 케이스만 1회 서버 조회로 채우고 이후부터 저장합니다.
 * - login/setUser/updateProfile/logout에서 user 저장/정리를 함께 처리해 상태-저장소 일관성을 맞춥니다.
 */
