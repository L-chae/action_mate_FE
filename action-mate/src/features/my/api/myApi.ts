// src/features/my/api/myApi.ts
import myApiLocal from "./myApi.local";
import myApiRemote from "./myApi.remote";

/**
 * 필요 시 앱 전역에서 이 값만 바꿔도 my 도메인 API가 교체되도록 구성
 * - 예: __DEV__ && process.env.EXPO_PUBLIC_USE_MOCK === "true"
 */
const USE_MOCK = __DEV__ && process.env.EXPO_PUBLIC_USE_MOCK === "true";

export const myApi = USE_MOCK ? myApiLocal : myApiRemote;
export default myApi;