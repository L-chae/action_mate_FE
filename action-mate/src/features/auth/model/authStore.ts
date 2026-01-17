// src/features/auth/model/authStore.ts
import { create } from "zustand";
import { getAccessToken, setAccessToken, clearAuthTokens } from "@/shared/api/authToken";
import { authApi } from "@/features/auth/api/authApi";
import type { User } from "./types";

type AuthState = {
  hasHydrated: boolean;
  isLoggedIn: boolean;
  user: User | null;

  hydrateFromStorage: () => Promise<void>;
  login: (user: User) => Promise<void>;
  logout: () => Promise<void>;

  updateUser: (patch: Partial<User>) => void;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  hasHydrated: false,
  isLoggedIn: false,
  user: null,

  hydrateFromStorage: async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        set({ hasHydrated: true, isLoggedIn: false, user: null });
        return;
      }

      const email = await authApi.getCurrentUserEmail();
      if (!email) {
        await clearAuthTokens();
        set({ hasHydrated: true, isLoggedIn: false, user: null });
        return;
      }

      const user = await authApi.getUserByEmail(email);
      if (!user) {
        await clearAuthTokens();
        await authApi.clearCurrentUserEmail();
        set({ hasHydrated: true, isLoggedIn: false, user: null });
        return;
      }

      set({ hasHydrated: true, isLoggedIn: true, user });
    } catch {
      set({ hasHydrated: true, isLoggedIn: false, user: null });
    }
  },

  login: async (user) => {
    // ✅ 서버 없이도 되는 목업 토큰
    await setAccessToken(`mock.${Date.now()}`);

    // ✅ 마지막 로그인 유저 이메일 저장 (hydrate용)
    await authApi.setCurrentUserEmail(user.email);

    set({ hasHydrated: true, isLoggedIn: true, user });
  },

  logout: async () => {
    await clearAuthTokens();
    await authApi.clearCurrentUserEmail();
    set({ isLoggedIn: false, user: null });
  },

  updateUser: (patch) => {
    const cur = get().user;
    if (!cur) return;
    set({ user: { ...cur, ...patch } });
  },
}));