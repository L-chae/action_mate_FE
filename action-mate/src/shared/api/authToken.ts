// src/shared/api/authToken.ts
import * as SecureStore from "expo-secure-store";

/**
 * 토큰/세션 관련 저장소 키
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
export async function getAccessToken() {
  return getItem(KEY_ACCESS);
}
export async function clearAccessToken() {
  await deleteItem(KEY_ACCESS);
}

// --- Refresh Token ---
export async function setRefreshToken(token: string) {
  await setItem(KEY_REFRESH, token);
}
export async function getRefreshToken() {
  return getItem(KEY_REFRESH);
}
export async function clearRefreshToken() {
  await deleteItem(KEY_REFRESH);
}

// --- Auth Tokens (All) ---
export async function clearAuthTokens() {
  await Promise.all([clearAccessToken(), clearRefreshToken()]);
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
 */
export async function withAuthHeader(headers: Record<string, string> = {}) {
  const token = await getAccessToken();
  if (!token) return headers;

  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
}