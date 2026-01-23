// src/features/auth/model/authStore.ts
import { create } from "zustand";
import { getAccessToken, clearAuthTokens } from "@/shared/api/authToken";
import { authApi } from "@/features/auth/api/authApi";
import { seedMockUsers } from "@/features/auth/api/authApi.local";
import type { User } from "./types";

/**
 * [개발용 설정]
 * true일 경우 앱 실행 시 저장된 세션이 없으면 'user01'로 자동 로그인 시도
 * ⚠️ 카카오 로그인 테스트 중에는 false로 설정하세요!
 */
const USE_MOCK = false; // __DEV__ && process.env.EXPO_PUBLIC_USE_MOCK === "true";

type AuthState = {
  hasHydrated: boolean; // 초기화 완료 여부
  isLoggedIn: boolean;  // 로그인 여부
  user: User | null;    // 로그인 유저 정보

  /** 앱 시작 시 세션 복구 */
  hydrateFromStorage: () => Promise<void>;

  /** * ✅ 로그인 상태 업데이트
   * (LoginScreen에서 토큰 저장 후 호출됨)
   */
  login: (user: User) => void;

  /** * ✅ [추가됨] 유저 정보 강제 업데이트
   * (프로필 수정 화면에서 UI 즉시 반영을 위해 사용) 
   */
  setUser: (user: User) => void;

  /** 로그아웃 (토큰 삭제 + 상태 초기화) */
  logout: () => Promise<void>;

  /** 프로필 업데이트 (서버 연동 포함) */
  updateProfile: (patch: Partial<User>) => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  hasHydrated: false,
  isLoggedIn: false,
  user: null,

  hydrateFromStorage: async () => {
    try {
      const token = await getAccessToken();
      const lastLoginId = await authApi.getCurrentLoginId();

      // 토큰이나 ID가 하나라도 없으면 => 비로그인 상태로 시작 (에러 아님)
      if (!token || !lastLoginId) {
        set({ hasHydrated: true, isLoggedIn: false, user: null });
        return;
      }

      // 서버에서 유저 정보 조회 시도
      const user = await authApi.getUserByLoginId(lastLoginId);
      
      if (!user) {
        // 토큰은 있는데 유저 정보가 안 긁히면 => 만료된 것으로 간주하고 로그아웃
        console.warn("User info not found, clearing session.");
        await clearAuthTokens(); // 토큰 삭제
        set({ hasHydrated: true, isLoggedIn: false, user: null });
        return;
      }

      // 성공
      set({ hasHydrated: true, isLoggedIn: true, user });

    } catch (e) {
      console.log("⚠️ 세션 복구 중 에러 (로그아웃 처리됨):", e);
      await clearAuthTokens();
      set({ hasHydrated: true, isLoggedIn: false, user: null });
    }
  },

  login: (user: User) => {
    // 메모리 상태 업데이트
    set({ isLoggedIn: true, user });
    
    // (선택) 여기서 로컬에 ID 저장 로직을 추가할 수도 있습니다.
    authApi.setCurrentLoginId(user.loginId).catch(console.warn);
  },

  // ✅ [추가됨] setUser 구현부
  setUser: (user: User) => {
    set({ user });
  },

  logout: async () => {
    await clearAuthTokens();
    await authApi.clearCurrentLoginId();
    set({ isLoggedIn: false, user: null });
  },

  updateProfile: async (patch: Partial<User>) => {
    const currentUser = get().user;
    if (!currentUser) return;

    // 1. 낙관적 업데이트 (UI 먼저 변경)
    const optimisticUser = { ...currentUser, ...patch };
    set({ user: optimisticUser });

    try {
      // 2. 서버 요청
      const updatedUser = await authApi.updateUser(currentUser.loginId, patch);
      // 3. 서버 응답값으로 확정
      set({ user: updatedUser });
    } catch (e) {
      console.error("프로필 수정 실패:", e);
      // 4. 실패 시 롤백
      set({ user: currentUser });
      throw e;
    }
  },
}));

// --- 헬퍼 함수: 자동 목업 로그인 ---
async function tryAutoMockLogin(set: any) {
  try {
    console.log("⚡️ [DEV] 자동 목업 로그인 시도...");
    const user = await authApi.login({ loginId: "user01", password: "1234" });
    set({ hasHydrated: true, isLoggedIn: true, user });
  } catch (e) {
    console.log("❌ [DEV] 자동 로그인 실패");
    set({ hasHydrated: true, isLoggedIn: false, user: null });
  }
}