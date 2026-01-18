// src/features/auth/api/authApi.ts
import type { AuthApi } from "@/features/auth/model/types";
import * as Local from "./authApi.local";
import * as Remote from "./authApi.remote";

// ✅ 루트 env에서 EXPO_PUBLIC_USE_MOCK=true/false 로 제어
const USE_MOCK = __DEV__ && process.env.EXPO_PUBLIC_USE_MOCK === "true";

export const authApi: AuthApi = (USE_MOCK ? Local : Remote) as AuthApi;