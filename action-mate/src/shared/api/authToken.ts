// src/shared/api/authToken.ts
import * as SecureStore from "expo-secure-store";

/**
 * 토큰/세션 관련 저장소 키
 * - 기존 앱에서 이미 쓰고 있는 키를 유지해 마이그레이션/호환 이슈를 줄입니다.
 */
const KEY_ACCESS = "actionmate.accessToken";
const KEY_REFRESH = "actionmate.refreshToken";
const KEY_CURRENT_USER_ID = "actionmate.currentUserId";

async function setItem(key: string, value: string) {
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
}

async function getItem(key: string) {
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string) {
  await SecureStore.deleteItemAsync(key);
}

// --- Access Token ---
export async function setAccessToken(token: string) {
  await setItem(KEY_ACCESS, token);
}
export async function getAccessToken(): Promise<string | null> {
  return getItem(KEY_ACCESS);
}
export async function clearAccessToken() {
  await deleteItem(KEY_ACCESS);
}

// --- Refresh Token ---
export async function setRefreshToken(token: string) {
  await setItem(KEY_REFRESH, token);
}
export async function getRefreshToken(): Promise<string | null> {
  return getItem(KEY_REFRESH);
}
export async function clearRefreshToken() {
  await deleteItem(KEY_REFRESH);
}

// --- Current User ID (Client Side Session) ---
export async function setCurrentUserId(userId: string) {
  await setItem(KEY_CURRENT_USER_ID, userId);
}
export async function getCurrentUserId(): Promise<string | null> {
  return getItem(KEY_CURRENT_USER_ID);
}
export async function clearCurrentUserId() {
  await deleteItem(KEY_CURRENT_USER_ID);
}

/**
 * 토큰을 한 번에 설정(로그인/갱신 응답 처리에 편리)
 */
export async function setAuthTokens(tokens: { accessToken: string; refreshToken: string }) {
  await Promise.all([setAccessToken(tokens.accessToken), setRefreshToken(tokens.refreshToken)]);
}

/**
 * ✅ 토큰만 정리(access/refresh)
 * - "로그아웃"과 "인증 실패"를 구분해서 처리할 때 유용합니다.
 * - 예: refresh 실패 시 세션까지 지우는지(=logout 처리) 정책은 호출부가 선택
 */
export async function clearTokens() {
  await Promise.all([clearAccessToken(), clearRefreshToken()]);
}

/**
 * ✅ 세션 정리(tokens + currentUserId)
 * - 로그인 상태 판단에 쓰는 키(currentUserId)까지 같이 지워야
 *   hydrate/store가 "유령 로그인" 상태로 착각하지 않습니다.
 */
export async function clearSession() {
  await Promise.all([clearTokens(), clearCurrentUserId()]);
}

/**
 * ✅ 기존 이름 호환 유지
 * - 기존 코드가 clearAuthTokens()에 "세션까지 정리"를 기대하므로 의미를 유지합니다.
 */
export async function clearAuthTokens() {
  await clearSession();
}

/**
 * Authorization 헤더 헬퍼
 * - axios 호출 시 headers를 합치기 편하게 사용
 */
export async function withAuthHeader(headers: Record<string, string> = {}) {
  const token = await getAccessToken();
  if (!token) return headers;

  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Refresh 토큰 헤더 헬퍼(필요 시)
 */
export async function withRefreshAuthHeader(headers: Record<string, string> = {}) {
  const token = await getRefreshToken();
  if (!token) return headers;

  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
}