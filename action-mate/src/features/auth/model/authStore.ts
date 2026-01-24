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
  const next: Partial<User> = { ...patch };
  delete (next as any).id;
  delete (next as any).loginId;
  return next;
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

      // ✅ 세션/토큰 조합이 깨진 경우를 먼저 정리
      // - loginId만 있고 토큰이 없으면: 서버 호출해봐야 401로 끝날 확률이 높음
      // - 토큰만 있고 loginId가 없으면: hydrate에서 누굴 조회할지 모름(유령 토큰)
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

      // 세션이 있으면 유저 조회
      const user = await authApi.getUserByLoginId(lastLoginId);

      if (!user) {
        // 세션은 있는데 유저를 못 가져오면 정리(일관성)
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

    // 로그인 성공 시 loginId 세션 저장(실패해도 UI 흐름은 유지)
    // (authApi.login 내부에서도 저장하지만, 화면에서 직접 user만 세팅하는 흐름을 대비)
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

    // 1) 낙관적 업데이트(즉시 UI 반영)
    const optimisticUser: User = { ...currentUser, ...safePatch };
    set({ user: optimisticUser });

    try {
      // 2) 서버/로컬 반영(서버 명세 없으면 remote에서 throw)
      const updatedUser = await authApi.updateUser(currentUser.loginId, safePatch);

      // 3) 응답으로 확정
      set({ user: updatedUser });
    } catch (e) {
      // 4) 실패 시 롤백
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