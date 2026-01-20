import { create } from "zustand";
import { getAccessToken, setAccessToken, clearAuthTokens } from "@/shared/api/authToken";
import { authApi } from "@/features/auth/api/authApi";
import { seedMockUsers } from "@/features/auth/api/authApi.local";
import type { User } from "./types";

/**
 * [Configuration]
 * USE_AUTO_MOCK: true일 경우 세션이 없으면 seed 계정(user01)로 자동 로그인합니다.
 * 실서버 연동 시 이 플래그를 false로 변경하세요.
 */
const USE_AUTO_MOCK = __DEV__ && true;

const AUTO_LOGIN_ID = "user01";
const AUTO_LOGIN_PW = "1234";

type AuthState = {
  hasHydrated: boolean;
  isLoggedIn: boolean;
  user: User | null;

  hydrateFromStorage: () => Promise<void>;

  /** ✅ 로그인: authApi.login({loginId, password}) 결과를 받아 저장 */
  login: (user: User) => Promise<void>;

  logout: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  hasHydrated: false,
  isLoggedIn: false,
  user: null,

  /** 앱 실행 시 저장된 세션 복구 또는 자동 목업 로그인 */
  hydrateFromStorage: async () => {
    try {
      // ✅ 목업에서는 seed가 먼저 준비되어야 user01 조회/로그인이 안정적
      if (USE_AUTO_MOCK) {
        await seedMockUsers();
      }

      const token = await getAccessToken();

      // 1) 토큰이 없는 경우
      if (!token) {
        if (USE_AUTO_MOCK) {
          // ✅ seed 계정으로 실제 로그인 수행(저장소와 동일한 유저 객체 확보)
          const u = await authApi.login({ loginId: AUTO_LOGIN_ID, password: AUTO_LOGIN_PW });
          await get().login(u);
          return;
        }

        set({ hasHydrated: true, isLoggedIn: false, user: null });
        return;
      }

      // 2) 저장된 "현재 로그인 아이디"
      const loginId = await authApi.getCurrentLoginId();
      if (!loginId) {
        if (USE_AUTO_MOCK) {
          const u = await authApi.login({ loginId: AUTO_LOGIN_ID, password: AUTO_LOGIN_PW });
          await get().login(u);
          return;
        }

        await clearAuthTokens();
        set({ hasHydrated: true, isLoggedIn: false, user: null });
        return;
      }

      // 3) 유저 정보 조회
      const user = await authApi.getUserByLoginId(loginId);
      if (!user) {
        if (USE_AUTO_MOCK) {
          const u = await authApi.login({ loginId: AUTO_LOGIN_ID, password: AUTO_LOGIN_PW });
          await get().login(u);
          return;
        }

        await clearAuthTokens();
        await authApi.clearCurrentLoginId();
        set({ hasHydrated: true, isLoggedIn: false, user: null });
        return;
      }

      // 4) 세션 복구 성공
      set({ hasHydrated: true, isLoggedIn: true, user });
    } catch (e) {
      console.error("Auth hydration error:", e);

      // ✅ 예외 상황에서도 목업이면 자동 로그인으로 회복
      if (USE_AUTO_MOCK) {
        try {
          await seedMockUsers();
          const u = await authApi.login({ loginId: AUTO_LOGIN_ID, password: AUTO_LOGIN_PW });
          await get().login(u);
          return;
        } catch (e2) {
          console.error("Mock auto-login failed:", e2);
        }
      }

      set({ hasHydrated: true, isLoggedIn: false, user: null });
    }
  },

  /** 로그인 로직 (토큰 및 현재 로그인 아이디 저장 포함) */
  login: async (user) => {
    // ✅ 목업/서버 공통: 토큰 설정
    // - 서버 전환 시에는 authApi가 토큰을 내려주게 바꾸고 여기만 교체하면 됩니다.
    await setAccessToken(`mock.${Date.now()}`);

    // ✅ loginId 저장
    await authApi.setCurrentLoginId(user.loginId);

    set({ hasHydrated: true, isLoggedIn: true, user });
  },

  /** 로그아웃 및 스토리지 초기화 */
  logout: async () => {
    await clearAuthTokens();
    await authApi.clearCurrentLoginId();
    set({ isLoggedIn: false, user: null });
  },

  /** 유저 프로필 정보 업데이트 (상태만 반영) */
  updateUser: (patch) => {
    const cur = get().user;
    if (!cur) return;
    set({ user: { ...cur, ...patch } });
  },
}));