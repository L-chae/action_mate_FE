// src/features/auth/authStore.ts
import { create } from "zustand";
import {
  getAccessToken,
  setAccessToken,
  clearAuthTokens,
} from "@/shared/api/authToken";

type User = {
  id: string;
  email: string;
  nickname: string;
};

type AuthState = {
  hasHydrated: boolean;
  isLoggedIn: boolean;
  user: User | null;

  hydrateFromStorage: () => Promise<void>;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  hasHydrated: false,
  isLoggedIn: false,
  user: null,

  hydrateFromStorage: async () => {
    try {
      const token = await getAccessToken();

      if (token) {
        set({
          hasHydrated: true,
          isLoggedIn: true,
          user: {
            id: "mock_user",
            email: "mock@local.dev",
            nickname: "로컬 사용자",
          },
        });
      } else {
        set({
          hasHydrated: true,
          isLoggedIn: false,
          user: null,
        });
      }
    } catch {
      // 저장소 에러 등 발생 시 안전하게 로그아웃 상태로
      set({ hasHydrated: true, isLoggedIn: false, user: null });
    }
  },

  login: async (user) => {
    // ✅ 서버 없이도 되는 목업 토큰
    await setAccessToken(`mock.${Date.now()}`);

    set({
      isLoggedIn: true,
      user,
    });
  },

  logout: async () => {
    await clearAuthTokens();
    set({
      isLoggedIn: false,
      user: null,
    });
  },
}));
