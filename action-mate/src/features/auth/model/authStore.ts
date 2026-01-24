// src/features/auth/model/authStore.ts
import { create } from "zustand";
import { clearAuthTokens, getAccessToken } from "@/shared/api/authToken";
import { authApi } from "@/features/auth/api/authApi";
import type { User } from "./types";

/**
 * [개발용 설정]
 * - USE_MOCK가 true면 hydrate 시 "세션이 없을 경우" mock 자동 로그인 시도
 */
const USE_MOCK = false; // 필요 시 __DEV__ 조건/환경변수로 제어 권장

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

  /**
   * 프로필 업데이트
   * - remoteApi는 명세에 update가 없어서 throw → UI에서 분기하거나 try/catch로 처리
   */
  updateProfile: (patch: Partial<User>) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  hasHydrated: false,
  isLoggedIn: false,
  user: null,

  hydrateFromStorage: async () => {
    try {
      const [token, lastLoginId] = await Promise.all([getAccessToken(), authApi.getCurrentLoginId()]);

      // 세션이 없으면 비로그인 상태로 종료
      if (!token || !lastLoginId) {
        if (USE_MOCK) {
          // 개발 편의: 세션 없으면 자동 로그인 시도
          await tryAutoMockLogin(set);
          return;
        }

        set({ hasHydrated: true, isLoggedIn: false, user: null });
        return;
      }

      // 세션이 있으면 서버/로컬에서 유저 조회
      const user = await authApi.getUserByLoginId(lastLoginId);

      if (!user) {
        // 토큰은 있는데 유저를 못 가져오면 세션을 정리
        await authApi.clearCurrentLoginId().catch(() => undefined);
        await clearAuthTokens();
        set({ hasHydrated: true, isLoggedIn: false, user: null });
        return;
      }

      set({ hasHydrated: true, isLoggedIn: true, user });
    } catch (e) {
      // hydrate는 "앱 부팅 안정성"이 목적이므로 실패 시 깨끗이 초기화하는 게 안전
      await authApi.clearCurrentLoginId().catch(() => undefined);
      await clearAuthTokens();
      set({ hasHydrated: true, isLoggedIn: false, user: null });
    }
  },

  login: (user: User) => {
    set({ isLoggedIn: true, user });

    // 로그인 성공 시 loginId 세션 저장(실패해도 UI 흐름은 유지)
    authApi.setCurrentLoginId(user.loginId).catch(() => undefined);
  },

  setUser: (user: User | null) => {
    set({ user, isLoggedIn: !!user });
  },

  logout: async () => {
    // remoteApi.clearCurrentLoginId 내부에서 서버 로그아웃을 시도하므로
    // 여기서는 clearAuthTokens를 중복 호출하지 않도록 순서를 정리
    await authApi.clearCurrentLoginId().catch(() => undefined);
    await clearAuthTokens();
    set({ isLoggedIn: false, user: null });
  },

  updateProfile: async (patch: Partial<User>) => {
    const currentUser = get().user;
    if (!currentUser) return;

    // 1) 낙관적 업데이트(화면 즉시 반영)
    const optimisticUser: User = { ...currentUser, ...patch };
    set({ user: optimisticUser });

    try {
      // 2) 서버/로컬 반영(서버 명세 없으면 remote에서 throw)
      const updatedUser = await authApi.updateUser(currentUser.loginId, patch);

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
// DEV helper 개발용 자동 로그인
// ----------------------------------------------------------------------
async function tryAutoMockLogin(setState: (p: Partial<AuthState>) => void) {
  try {
    const user = await authApi.login({ loginId: "user01", password: "1234" });
    setState({ hasHydrated: true, isLoggedIn: true, user });
  } catch {
    setState({ hasHydrated: true, isLoggedIn: false, user: null });
  }
}
