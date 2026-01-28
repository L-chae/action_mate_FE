// src/shared/api/authToken.ts
import * as SecureStore from "expo-secure-store";

/**
 * 토큰/세션 관련 저장소 키
 * - ShortOrg 기준 키로 정리하되, 기존 키(actionmate.*)가 있으면 자동 마이그레이션합니다.
 */
const KEY_ACCESS = "shortorg.accessToken";
const KEY_REFRESH = "shortorg.refreshToken";
const KEY_CURRENT_USER_ID = "shortorg.currentUserId";

// legacy (기존 앱/이전 네이밍)
const LEGACY_KEY_ACCESS = "actionmate.accessToken";
const LEGACY_KEY_REFRESH = "actionmate.refreshToken";
const LEGACY_KEY_CURRENT_USER_ID = "actionmate.currentUserId";

type KeychainAccessible =
  | typeof SecureStore.AFTER_FIRST_UNLOCK
  | typeof SecureStore.ALWAYS
  | typeof SecureStore.WHEN_UNLOCKED
  | typeof SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY
  | typeof SecureStore.ALWAYS_THIS_DEVICE_ONLY
  | typeof SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  | typeof SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY;

const KEYCHAIN_ACCESSIBLE: KeychainAccessible = SecureStore.AFTER_FIRST_UNLOCK;

// SecureStore 미지원/오류 대비 in-memory fallback(앱 크래시 방지용)
const memoryStore: Record<string, string> = {};
let cachedAvailability: boolean | null = null;

async function isSecureStoreAvailable(): Promise<boolean> {
  if (cachedAvailability !== null) return cachedAvailability;
  try {
    const ok = await SecureStore.isAvailableAsync();
    cachedAvailability = !!ok;
    return cachedAvailability;
  } catch {
    cachedAvailability = false;
    return false;
  }
}

async function setItem(key: string, value: string): Promise<void> {
  const v = String(value ?? "");
  if (!v) {
    await deleteItem(key);
    return;
  }

  const available = await isSecureStoreAvailable();
  if (!available) {
    memoryStore[key] = v;
    return;
  }

  try {
    await SecureStore.setItemAsync(key, v, { keychainAccessible: KEYCHAIN_ACCESSIBLE });
  } catch {
    memoryStore[key] = v;
  }
}

async function getItem(key: string): Promise<string | null> {
  const available = await isSecureStoreAvailable();
  if (!available) return memoryStore[key] ?? null;

  try {
    const v = await SecureStore.getItemAsync(key);
    return v ?? null;
  } catch {
    return memoryStore[key] ?? null;
  }
}

async function deleteItem(key: string): Promise<void> {
  const available = await isSecureStoreAvailable();
  if (!available) {
    delete memoryStore[key];
    return;
  }

  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    delete memoryStore[key];
  }
}

async function migrateIfNeeded(newKey: string, legacyKey: string): Promise<void> {
  try {
    const hasNew = await getItem(newKey);
    if (hasNew) return;

    const legacy = await getItem(legacyKey);
    if (!legacy) return;

    await setItem(newKey, legacy);
    await deleteItem(legacyKey);
  } catch {
    // 마이그레이션 실패는 치명적이지 않으므로 무시(다음 호출에서 재시도 가능)
  }
}

// --- Access Token ---
export async function setAccessToken(token: string): Promise<void> {
  await setItem(KEY_ACCESS, token);
}
export async function getAccessToken(): Promise<string | null> {
  await migrateIfNeeded(KEY_ACCESS, LEGACY_KEY_ACCESS);
  const v = await getItem(KEY_ACCESS);
  return v && v.length > 0 ? v : null;
}
export async function clearAccessToken(): Promise<void> {
  await Promise.allSettled([deleteItem(KEY_ACCESS), deleteItem(LEGACY_KEY_ACCESS)]);
}

// --- Refresh Token ---
export async function setRefreshToken(token: string): Promise<void> {
  await setItem(KEY_REFRESH, token);
}
export async function getRefreshToken(): Promise<string | null> {
  await migrateIfNeeded(KEY_REFRESH, LEGACY_KEY_REFRESH);
  const v = await getItem(KEY_REFRESH);
  return v && v.length > 0 ? v : null;
}
export async function clearRefreshToken(): Promise<void> {
  await Promise.allSettled([deleteItem(KEY_REFRESH), deleteItem(LEGACY_KEY_REFRESH)]);
}

// --- Current User ID (Client Side Session) ---
export async function setCurrentUserId(userId: string): Promise<void> {
  await setItem(KEY_CURRENT_USER_ID, userId);
}
export async function getCurrentUserId(): Promise<string | null> {
  await migrateIfNeeded(KEY_CURRENT_USER_ID, LEGACY_KEY_CURRENT_USER_ID);
  const v = await getItem(KEY_CURRENT_USER_ID);
  return v && v.length > 0 ? v : null;
}
export async function clearCurrentUserId(): Promise<void> {
  await Promise.allSettled([deleteItem(KEY_CURRENT_USER_ID), deleteItem(LEGACY_KEY_CURRENT_USER_ID)]);
}

/**
 * 토큰을 한 번에 설정(로그인/갱신 응답 처리에 편리)
 */
export async function setAuthTokens(tokens: { accessToken: string; refreshToken: string }): Promise<void> {
  const access = String(tokens?.accessToken ?? "");
  const refresh = String(tokens?.refreshToken ?? "");
  await Promise.all([setAccessToken(access), setRefreshToken(refresh)]);
}

/**
 * ✅ 토큰만 정리(access/refresh)
 */
export async function clearTokens(): Promise<void> {
  await Promise.all([clearAccessToken(), clearRefreshToken()]);
}

/**
 * ✅ 세션 정리(tokens + currentUserId)
 */
export async function clearSession(): Promise<void> {
  await Promise.all([clearTokens(), clearCurrentUserId()]);
}

/**
 * ✅ 기존 이름 호환 유지
 * - 기존 코드가 clearAuthTokens()에 "세션까지 정리"를 기대하므로 의미를 유지합니다.
 */
export async function clearAuthTokens(): Promise<void> {
  await clearSession();
}

/**
 * Authorization 헤더 헬퍼
 * - axios 호출 시 headers를 합치기 편하게 사용
 */
export async function withAuthHeader(headers: Record<string, string> = {}): Promise<Record<string, string>> {
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
export async function withRefreshAuthHeader(headers: Record<string, string> = {}): Promise<Record<string, string>> {
  const token = await getRefreshToken();
  if (!token) return headers;

  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
}

// 요약(3줄)
// - SecureStore 미지원/오류 시 in-memory fallback으로 앱 셧다운을 방지.
// - legacy 키(actionmate.*)를 자동 마이그레이션해 기존 사용자 세션을 보존.
// - Authorization은 항상 Bearer 형식을 전제로 헤더 헬퍼를 유지.