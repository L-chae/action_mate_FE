// src/features/auth/model/authStore.ts
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

/**
 * Auth Store
 *
 * 설계 의도:
 * - hydrate는 "앱 부팅 안정성"이 목표 → 실패 시 세션 정리 후 비로그인으로 수렴
 * - "세션 존재" 판단은 (currentUserId or legacyLoginId) + (access 또는 refresh) 조합으로 판단
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
  const next: Partial<User> = { ...patch };
  delete (next as any).id;
  delete (next as any).loginId;
  return next;
}

async function resetSessionSafely() {
  // ✅ shared 토큰/세션 + legacy currentLoginId(있다면)까지 같이 정리
  await Promise.allSettled([
    clearAuthTokens(),
    authApi.clearCurrentLoginId().catch(() => undefined),
  ]);
}

async function persistLoginId(loginId: string) {
  const safeLoginId = String(loginId ?? "").trim();
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
      const [storedUserId, legacyLoginId, accessToken, refreshToken] =
        await Promise.all([
          getCurrentUserId(),
          authApi.getCurrentLoginId().catch(() => null),
          getAccessToken(),
          getRefreshToken(),
        ]);

      const loginId = storedUserId ?? legacyLoginId ?? null;
      const hasAnyToken = !!accessToken || !!refreshToken;

      // ✅ 세션/토큰 조합이 깨진 경우를 먼저 정리
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

      // 세션이 있으면 유저 조회 (명세상 userId === loginId)
      const user = await authApi.getUserByLoginId(loginId);

      if (!user) {
        await resetSessionSafely();
        set({ hasHydrated: true, isLoggedIn: false, user: null });
        return;
      }

      // 저장소 키가 legacy만 남아있을 수 있어, 여기서 한 번 통일 저장
      await persistLoginId(user.loginId);

      set({ hasHydrated: true, isLoggedIn: true, user });
    } catch {
      await resetSessionSafely();
      set({ hasHydrated: true, isLoggedIn: false, user: null });
    }
  },

  login: (user: User) => {
    const nextUser: User = user ?? (null as any);
    if (!nextUser) {
      set({ isLoggedIn: false, user: null });
      return;
    }

    set({ isLoggedIn: true, user: nextUser });

    // 로그인 성공 시 currentUserId 저장(실패해도 UI 흐름은 유지)
    persistLoginId(nextUser.loginId).catch(() => undefined);
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
      // 2) 서버/로컬 반영(서버 명세에 update 없음 → remote에서는 throw 가능)
      const updatedUser = await authApi.updateUser(
        currentUser.loginId,
        safePatch
      );

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

    await persistLoginId(user?.loginId ?? "");

    setState({ hasHydrated: true, isLoggedIn: true, user });
  } catch {
    setState({ hasHydrated: true, isLoggedIn: false, user: null });
  }
}

// 3줄 요약
// - 로그인 식별자는 명세상 userId==loginId로 보고 currentUserId 기반으로 hydrate하도록 정리했습니다.
// - legacy currentLoginId도 같이 읽고/저장해 마이그레이션 중에도 세션이 끊기지 않게 했습니다.
// - 세션 정리는 clearAuthTokens + legacy clearCurrentLoginId를 함께 호출해 “유령 세션”을 방지했습니다.