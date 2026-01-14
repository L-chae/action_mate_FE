// src/shared/api/authToken.ts
import * as SecureStore from "expo-secure-store";

const KEY_ACCESS = "actionmate.accessToken";
const KEY_REFRESH = "actionmate.refreshToken";

async function setItem(key: string, value: string) {
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK, // iOS 옵션(안전 기본값)
  });
}

async function getItem(key: string) {
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string) {
  await SecureStore.deleteItemAsync(key);
}

export async function setAccessToken(token: string) {
  await setItem(KEY_ACCESS, token);
}

export async function getAccessToken() {
  return getItem(KEY_ACCESS);
}

export async function clearAccessToken() {
  await deleteItem(KEY_ACCESS);
}

export async function setRefreshToken(token: string) {
  await setItem(KEY_REFRESH, token);
}

export async function getRefreshToken() {
  return getItem(KEY_REFRESH);
}

export async function clearRefreshToken() {
  await deleteItem(KEY_REFRESH);
}

export async function clearAuthTokens() {
  await Promise.all([clearAccessToken(), clearRefreshToken()]);
}

/**
 * Authorization 헤더에 넣기 위한 헬퍼
 * 사용 예: const headers = await withAuthHeader({ "Content-Type": "application/json" })
 */
export async function withAuthHeader(headers: Record<string, string> = {}) {
  const token = await getAccessToken();
  if (!token) return headers;

  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
}
