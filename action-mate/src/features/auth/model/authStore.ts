// src/features/auth/model/authStore.ts
import { create } from "zustand";
import { authApi, USE_MOCK_AUTO_LOGIN, MOCK_AUTO_LOGIN_CREDENTIALS } from "@/features/auth/api/authApi";
import { getAccessToken, getRefreshToken } from "@/shared/api/authToken";
import type { User } from "./types";

/**
 * Auth Store
 *
 * 설계 의도(왜 이렇게?):
 * - hydrate는 "앱 부팅 안정성"이 목표 → 실패 시 깨끗하게 세션을 정리하고 비로그인으로 수렴
 * - "세션 존재" 판단은 loginId + (access 또는 refresh) 둘 다를 보는 게 안전
 *   → loginId만 남아있는 유령 세션/토큰만 남은 유령 토큰을 빠르게 정리
 */

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

function sanitizeUserPatch(patch: Partial<User>): Partial<User> {
  // 왜 막나?:
  // - id/loginId는 관계키/세션키로 쓰이므로 UI에서 실수로 덮어써도 상태가 깨지지 않게 방어
  const next: any = { ...(patch ?? {}) };

  delete next.id;
  delete next.loginId;

  // undefined 키 제거(필수 필드가 undefined로 덮이는 사고 방지)
  Object.keys(next).forEach((k) => {
    if (next[k] === undefined) delete next[k];
  });

  return next as Partial<User>;
}

async function resetSessionSafely() {
  // clearCurrentLoginId 내부에서 tokens + currentUserId까지 정리(=세션 정리)
  await authApi.clearCurrentLoginId().catch(() => undefined);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  hasHydrated: false,
  isLoggedIn: false,
  user: null,

  hydrateFromStorage: async () => {
    try {
      const [lastLoginId, accessToken, refreshToken] = await Promise.all([
        authApi.getCurrentLoginId(),
        getAccessToken(),
        getRefreshToken(),
      ]);

      const hasAnyToken = !!accessToken || !!refreshToken;

      if (!lastLoginId || !hasAnyToken) {
        if (lastLoginId || hasAnyToken) {
          await resetSessionSafely();
        }

        if (!lastLoginId && USE_MOCK_AUTO_LOGIN) {
          await tryAutoMockLogin(set);
          return;
        }

        set({ hasHydrated: true, isLoggedIn: false, user: null });
        return;
      }

      const user = await authApi.getUserByLoginId(lastLoginId);

      if (!user) {
        await resetSessionSafely();
        set({ hasHydrated: true, isLoggedIn: false, user: null });
        return;
      }

      set({ hasHydrated: true, isLoggedIn: true, user });
    } catch {
      await resetSessionSafely();
      set({ hasHydrated: true, isLoggedIn: false, user: null });
    }
  },

  login: (user: User) => {
    set({ isLoggedIn: true, user });
    authApi.setCurrentLoginId(user.loginId).catch(() => undefined);
  },

  setUser: (user: User | null) => {
    set({ user, isLoggedIn: !!user });
  },

  logout: async () => {
    await resetSessionSafely();
    set({ isLoggedIn: false, user: null });
  },

  updateProfile: async (patch: Partial<User>) => {
    const currentUser = get().user;
    if (!currentUser) return;

    const safePatch = sanitizeUserPatch(patch);

    // 낙관적 업데이트(즉시 UI 반영) - undefined 제거가 되어 있어 필수 필드 오염 방지
    const optimisticUser: User = { ...currentUser, ...safePatch };
    set({ user: optimisticUser });

    try {
      const updatedUser = await authApi.updateUser(currentUser.loginId, safePatch);
      set({ user: updatedUser });
    } catch (e) {
      set({ user: currentUser });
      throw e;
    }
  },
}));

// ----------------------------------------------------------------------
// DEV helper: Mock 자동 로그인
// ----------------------------------------------------------------------
async function tryAutoMockLogin(setState: (p: Partial<AuthState>) => void) {
  try {
    const user = await authApi.login({
      loginId: MOCK_AUTO_LOGIN_CREDENTIALS.loginId,
      password: MOCK_AUTO_LOGIN_CREDENTIALS.password,
    });
    setState({ hasHydrated: true, isLoggedIn: true, user });
  } catch {
    setState({ hasHydrated: true, isLoggedIn: false, user: null });
  }
}
