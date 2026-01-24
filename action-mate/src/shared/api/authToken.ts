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

// --- Auth Tokens (All) ---
export async function clearAuthTokens() {
  await Promise.all([clearAccessToken(), clearRefreshToken(), clearCurrentUserId()]);
}

/**
 * 토큰을 한 번에 설정(로그인/갱신 응답 처리에 편리)
 */
export async function setAuthTokens(tokens: { accessToken: string; refreshToken: string }) {
  await Promise.all([setAccessToken(tokens.accessToken), setRefreshToken(tokens.refreshToken)]);
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