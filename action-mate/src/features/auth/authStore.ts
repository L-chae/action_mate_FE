// src/features/auth/authStore.ts
import { create } from "zustand";

type User = {
  id: string;
  email: string;
  nickname: string;
};

type AuthState = {
  isLoggedIn: boolean;
  user: User | null;

  login: (user: User) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  user: null,

  login: (user) =>
    set({
      isLoggedIn: true,
      user,
    }),

  logout: () =>
    set({
      isLoggedIn: false,
      user: null,
    }),
}));
