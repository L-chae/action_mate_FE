import type { AuthApi } from "@/features/auth/model/types";
import LocalApi from "./authApi.local";   // default export로 불러옴
import RemoteApi from "./authApi.remote"; // default export로 불러옴

// ✅ 루트 env에서 EXPO_PUBLIC_USE_MOCK=true/false 로 제어
// (__DEV__일 때만 Mock 사용 가능하도록 안전장치 추가)
const USE_MOCK = __DEV__ && process.env.EXPO_PUBLIC_USE_MOCK === "true";

// 선택된 API 구현체를 내보냅니다.
export const authApi: AuthApi = USE_MOCK ? LocalApi : RemoteApi;