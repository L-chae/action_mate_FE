// src/features/auth/model/authStore.ts
import { create } from "zustand";
import { getAccessToken, clearAuthTokens } from "@/shared/api/authToken";
import { authApi } from "@/features/auth/api/authApi";
import { seedMockUsers } from "@/features/auth/api/authApi.local";
import type { User } from "./types";

/**
 * [개발용 설정]
 * true일 경우 앱 실행 시 저장된 세션이 없으면 'user01'로 자동 로그인 시도
 */
const USE_AUTO_MOCK = __DEV__ && true;

type AuthState = {
  hasHydrated: boolean; // 초기화 완료 여부
  isLoggedIn: boolean;  // 로그인 여부
  user: User | null;    // 로그인 유저 정보

  /** 앱 시작 시 세션 복구 */
  hydrateFromStorage: () => Promise<void>;

  /** * ✅ 로그인 상태 업데이트
   * 주의: API 호출이나 토큰 저장은 이 함수 호출 전에 완료되어야 함 
   */
  login: (user: User) => void;

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
    // 1. 개발 모드: 시드 데이터 확인 (필요시)
    if (__DEV__) {
      await seedMockUsers(); 
    }

    try {
      // 2. 토큰 존재 확인
      const token = await getAccessToken();
      if (!token) {
        // 토큰 없으면 자동 로그인 시도 or 실패 처리
        if (USE_AUTO_MOCK) {
          await tryAutoMockLogin(set);
        } else {
          set({ hasHydrated: true, isLoggedIn: false, user: null });
        }
        return;
      }

      // 3. 마지막 로그인 ID 확인
      const lastLoginId = await authApi.getCurrentLoginId();
      if (!lastLoginId) {
        throw new Error("No saved login ID");
      }

      // 4. 유저 정보 최신화 (서버/로컬 조회)
      const user = await authApi.getUserByLoginId(lastLoginId);
      if (!user) {
        throw new Error("User not found");
      }

      // 5. 성공: 상태 복구
      set({ hasHydrated: true, isLoggedIn: true, user });

    } catch (e) {
      console.log("⚠️ 세션 복구 실패:", e);
      // 복구 실패 시 자동 로그인 재시도 or 로그아웃 처리
      if (USE_AUTO_MOCK) {
        await tryAutoMockLogin(set);
      } else {
        await clearAuthTokens(); // 꼬인 토큰 삭제
        await authApi.clearCurrentLoginId();
        set({ hasHydrated: true, isLoggedIn: false, user: null });
      }
    }
  },

  // ✅ 개선: 단순히 상태만 변경 (토큰 처리는 LoginScreen에서 수행됨)
  login: (user: User) => {
    set({ isLoggedIn: true, user });
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
      // 2. 서버 요청 (실패 시 catch로 이동)
      // loginId를 기준으로 업데이트 요청
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