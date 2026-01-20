import * as SecureStore from "expo-secure-store";

/**
 * 토큰/세션 관련 저장소 키
 * - accessToken: 일반 API 호출용 (명세: 15분)
 * - refreshToken: 재발급용 (명세: 2주)
 * - currentUserId: FE에서 로그인 세션 식별용(명세에 직접 없음, 클라 편의 저장)
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
