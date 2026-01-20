import { create } from "zustand";
import { getAccessToken, setAccessToken, clearAuthTokens } from "@/shared/api/authToken";
import { authApi } from "@/features/auth/api/authApi";
import { seedMockUsers } from "@/features/auth/api/authApi.local";
import type { User } from "./types";

/**
 * [Configuration]
 * USE_AUTO_MOCK: true일 경우 세션이 없으면 seed 계정(user01)로 자동 로그인합니다.
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

  /** * ✅ 상태 강제 업데이트 (Optimistic Update용) 
   * UI를 즉시 갱신할 때 사용합니다.
   */
  setUser: (user: User) => Promise<void>;

  /** * ✅ 프로필 정보 업데이트 (API 호출 포함)
   * 서버(또는 목업 DB)에 변경사항을 저장하고 상태를 갱신합니다.
   */
  updateProfile: (patch: Partial<User>) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  hasHydrated: false,
  isLoggedIn: false,
  user: null,

  /** 앱 실행 시 저장된 세션 복구 또는 자동 목업 로그인 */
  hydrateFromStorage: async () => {
    try {
      if (USE_AUTO_MOCK) {
        await seedMockUsers();
      }

      const token = await getAccessToken();

      // 1) 토큰이 없는 경우
      if (!token) {
        if (USE_AUTO_MOCK) {
          const u = await authApi.login({ loginId: AUTO_LOGIN_ID, password: AUTO_LOGIN_PW });
          await get().login(u);
          return;
        }
        set({ hasHydrated: true, isLoggedIn: false, user: null });
        return;
      }

      // 2) 저장된 "현재 로그인 아이디" 확인
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

  /** 로그인 로직 */
  login: async (user) => {
    await setAccessToken(`mock.${Date.now()}`);
    await authApi.setCurrentLoginId(user.loginId);
    set({ hasHydrated: true, isLoggedIn: true, user });
  },

  /** 로그아웃 */
  logout: async () => {
    await clearAuthTokens();
    await authApi.clearCurrentLoginId();
    set({ isLoggedIn: false, user: null });
  },

  /** * ✅ [NEW] 유저 상태 강제 설정 (UI 즉시 반영용)
   */
  setUser: async (user: User) => {
    set({ user });
  },

  /** * ✅ [NEW] 프로필 업데이트 (API 연동 + 상태 반영)
   */
  updateProfile: async (patch: Partial<User>) => {
    const currentUser = get().user;
    if (!currentUser) return;

    // 1. 상태 즉시 업데이트 (낙관적 업데이트)
    const optimisticUser = { ...currentUser, ...patch };
    set({ user: optimisticUser });

    // 2. API 호출 (로컬 스토리지/서버 저장)
    try {
      // 이제 authApi.updateUser는 반드시 존재하므로 직접 호출합니다.
      const updatedUserFromApi = await authApi.updateUser(currentUser.loginId, patch);
      
      // 3. API 응답값으로 상태 동기화 (확실한 데이터)
      set({ user: updatedUserFromApi });
    } catch (e) {
      console.error("Failed to update profile on server:", e);
      // 실패 시 롤백 로직이 필요하다면 여기에 추가 (여기선 생략)
      set({ user: currentUser }); // 에러 시 원래대로 복구
      throw e; // 화면단에서 에러 알림을 띄우기 위해 던짐
    }
  },
}));