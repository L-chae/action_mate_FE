// src/features/auth/model/mappers.ts
import type { ExistsResponse, LoginRequest, ProfileRequest, SignupRequest, TokenResponse } from "@/shared/api/schemas";
import { API_BASE_URL } from "@/shared/api/apiClient";
import type { UserProfile as SharedUserProfile } from "@/shared/model/types";
import { normalizeId } from "@/shared/model/types";
import { mapGenderToServerGender, mapServerGenderToGender } from "@/shared/model/mappers";
import type { LoginInput, SignupInput, User } from "@/features/auth/model/types";

/**
 * Auth/User mapper
 * - 서버 스키마 변화/혼재는 여기서 흡수
 * - UI/스토어는 User(UI 모델)만 사용
 */

function normalizeText(v: unknown): string {
  return String(v ?? "").trim();
}

function normalizeBaseUrl(raw: string): string {
  const trimmed = String(raw ?? "")
    .trim()
    .replace(/\/+$/, "");
  if (!trimmed) return "https://bold-seal-only.ngrok-free.app/api";
  if (trimmed.toLowerCase().endsWith("/api")) return trimmed;
  return `${trimmed}/api`;
}

function originFromApiBase(apiBaseUrl: string): string {
  return normalizeBaseUrl(apiBaseUrl).replace(/\/api\/?$/i, "");
}

function toNumberOrZero(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function buildAvatarUrlFromProfile(profile: unknown, apiBaseUrl: string): string | null {
  const p = normalizeText(profile);
  if (!p) return null;

  const lower = p.toLowerCase();
  if (lower.startsWith("http://") || lower.startsWith("https://")) return p;

  // 서버가 "/api/images/xxx" 형태로 내려주는 경우
  if (lower.startsWith("/api/images")) {
    return `${originFromApiBase(apiBaseUrl)}${p.startsWith("/") ? p : `/${p}`}`;
  }

  // 서버가 "/images/xxx" 형태로 내려주는 경우 (baseURL이 .../api)
  if (lower.startsWith("/images")) {
    return `${normalizeBaseUrl(apiBaseUrl)}${p.startsWith("/") ? p : `/${p}`}`;
  }

  // 파일명만 내려주는 경우를 보수적으로 "/images/{name}"로 가정
  const encoded = encodeURIComponent(p);
  return `${normalizeBaseUrl(apiBaseUrl)}/images/${encoded}`;
}

export const mapLoginInputToLoginRequest = (input: LoginInput): LoginRequest => ({
  id: normalizeText((input as any)?.loginId),
  password: normalizeText((input as any)?.password),
});

export const mapTokenResponseToTokens = (res: TokenResponse): { accessToken: string; refreshToken: string } => ({
  accessToken: normalizeText((res as any)?.accessToken),
  refreshToken: normalizeText((res as any)?.refreshToken),
});

export const mapSignupInputToSignupRequest = (input: SignupInput): SignupRequest => ({
  id: normalizeText((input as any)?.loginId),
  password: normalizeText((input as any)?.password),
  birth: normalizeText((input as any)?.birthDate),
  gender: mapGenderToServerGender((input as any)?.gender ?? "male") as any,
  nickname: normalizeText((input as any)?.nickname),
});

export const mapExistsResponseToAvailability = (res: ExistsResponse | unknown): boolean => {
  // 서버 확정: boolean (true=사용가능, false=사용불가)
  if (typeof res === "boolean") return res;

  // 레거시/혼재 방어
  const anyRes = res as any;
  if (anyRes && typeof anyRes.available === "boolean") return anyRes.available;
  if (anyRes && typeof anyRes.exists === "boolean") return !anyRes.exists;

  return false;
};

export const mapUserProfileResponseToSharedUserProfile = (
  res: ProfileRequest | (ProfileRequest & Record<string, unknown>),
  opts?: { apiBaseUrl?: string | null }
): SharedUserProfile => {
  const apiBaseUrl = opts?.apiBaseUrl ?? API_BASE_URL;

  const userId = normalizeText((res as any)?.userId ?? (res as any)?.id) || "unknown";
  const id = normalizeId(userId);
  const nickname = normalizeText((res as any)?.nickname) || "알 수 없음";

  const avatarUrl = buildAvatarUrlFromProfile((res as any)?.profile, apiBaseUrl);

  // ✅ SharedUserProfile(UserProfile)에서 필수인 필드(avgRate/orgTime) 기본값 보장
  const avgRate = toNumberOrZero((res as any)?.avgRate);
  const orgTime = toNumberOrZero((res as any)?.orgTime);

  const gender = mapServerGenderToGender((res as any)?.gender, "male");
  const birthDate = normalizeText((res as any)?.birth);

  return {
    id,
    nickname,
    avatarUrl: avatarUrl ?? null,
    avatarImageName: avatarUrl ?? null,
    avgRate,
    orgTime,
    gender,
    birthDate,
  } as SharedUserProfile;
};

/**
 * auth.User(UI) 생성
 * - 서버 /users/{userId}/profile(ProfileRequest) 응답을 기반으로 UI에서 안정적으로 쓰는 User로 변환
 */
export const mapUserProfileResponseToAuthUser = (
  res: ProfileRequest | (ProfileRequest & Record<string, unknown>),
  opts?: { apiBaseUrl?: string | null }
): User => {
  const apiBaseUrl = opts?.apiBaseUrl ?? API_BASE_URL;

  const loginId = normalizeText((res as any)?.userId ?? (res as any)?.id) || "unknown";
  const id = normalizeId(loginId);

  const nickname = normalizeText((res as any)?.nickname) || "알 수 없음";
  const avatarUrl = buildAvatarUrlFromProfile((res as any)?.profile, apiBaseUrl);

  return {
    id,
    loginId,
    nickname,
    avatarUrl: avatarUrl ?? null,
    avatarImageName: avatarUrl ?? null,
    gender: mapServerGenderToGender((res as any)?.gender, "male"),
    birthDate: normalizeText((res as any)?.birth),
  } as User;
};

/*
요약
- SharedUserProfile(UserProfile) 필수 필드(avgRate/orgTime)를 기본값(0)으로 보장해 TS2352 에러를 제거.
- /users/exists 응답은 서버 확정 boolean(true=사용가능)을 우선 적용하고 레거시 응답도 방어 처리.
- profile 문자열(URL/경로/파일명 혼재)을 보수적으로 처리해 이미지 URL 생성이 깨져도 앱 셧다운을 방지.
- /users/exists는 서버 확정 boolean(true=사용가능) 기준으로 매핑을 교정하고, 레거시 형태도 방어 처리.
- 프로필 응답은 ProfileRequest(userId/nickname/gender/birth/profile) 기준으로 User/SharedUserProfile 변환을 일원화.
- profile 문자열은 URL/경로/파일명 혼재를 가정해 /api/images(/images) 규칙으로 보수적 URL 빌드를 적용.
*/