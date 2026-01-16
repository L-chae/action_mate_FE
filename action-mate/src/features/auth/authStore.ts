// src/features/auth/authStore.ts
import { create } from "zustand";
import {
  getAccessToken,
  setAccessToken,
  clearAuthTokens,
} from "@/shared/api/authToken";

import {
  getCurrentUserEmail,
  setCurrentUserEmail,
  clearCurrentUserEmail,
  getUserByEmail,
} from "@/features/auth/localAuthService";

export type Gender = "male" | "female" | "none";

export type User = {
  id: string;
  email: string;
  nickname: string;

  // ✅ 추가
  gender: Gender; // "male" | "female" | "none"
  birthDate: string; // "YYYY-MM-DD" (미선택이면 "" 허용)
};

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

      // ✅ 토큰 없으면 확실히 로그아웃 상태
      if (!token) {
        set({ hasHydrated: true, isLoggedIn: false, user: null });
        return;
      }

      // ✅ 토큰은 있는데, 마지막 로그인 유저 식별이 없으면 안전하게 로그아웃 처리
      const email = await getCurrentUserEmail();
      if (!email) {
        set({ hasHydrated: true, isLoggedIn: false, user: null });
        return;
      }

      // ✅ 로컬 저장소에서 유저 조회
      const user = await getUserByEmail(email);
      if (!user) {
        // 유저가 삭제됐거나 데이터가 깨졌을 수 있음
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

    // ✅ 마지막 로그인 유저 이메일 저장(앱 재시작 후 hydrate용)
    await setCurrentUserEmail(user.email);

    set({
      hasHydrated: true,
      isLoggedIn: true,
      user,
    });
  },

  logout: async () => {
    await clearAuthTokens();
    await clearCurrentUserEmail();

    set({
      isLoggedIn: false,
      user: null,
    });
  },

  updateUser: (patch) => {
    const cur = get().user;
    if (!cur) return;
    set({ user: { ...cur, ...patch } });
  },
}));
