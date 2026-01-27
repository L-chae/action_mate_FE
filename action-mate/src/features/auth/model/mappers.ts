// src/features/auth/model/mappers.ts
import type {
  ApiUserProfileResponse,
  ExistsResponse,
  LoginRequest,
  SignupRequest,
  TokenResponse,
} from "@/shared/api/schemas";
import { API_BASE_URL } from "@/shared/api/apiClient";
import type { UserProfile as SharedUserProfile } from "@/shared/model/types";
import { normalizeId } from "@/shared/model/types";
import {
  buildImageUrlFromName,
  mapApiUserProfileToUserProfile,
  mapGenderToServerGender,
  mapServerGenderToGender,
} from "@/shared/model/mappers";
import type { LoginInput, SignupInput, User } from "@/features/auth/model/types";

/**
 * Auth/User mapper
 * - 서버 스키마 변화(필드명/nullable/타입 혼재)를 한 지점에서 흡수
 * - 화면/스토어는 UI 모델(User)만 사용하도록 강제하여 변경 영향 최소화
 */

export const mapLoginInputToLoginRequest = (input: LoginInput): LoginRequest => ({
  id: String(input?.loginId ?? ""),
  password: String(input?.password ?? ""),
});

export const mapTokenResponseToTokens = (
  res: TokenResponse
): { accessToken: string; refreshToken: string } => ({
  accessToken: String(res?.accessToken ?? ""),
  refreshToken: String(res?.refreshToken ?? ""),
});

export const mapSignupInputToSignupRequest = (input: SignupInput): SignupRequest => ({
  id: String(input?.loginId ?? ""),
  password: String(input?.password ?? ""),
  birth: input?.birthDate ?? undefined,
  gender: mapGenderToServerGender(input?.gender ?? "male"),
  nickname: String(input?.nickname ?? ""),
});

export const mapExistsResponseToAvailability = (res: ExistsResponse): boolean => !res?.exists;

export const mapUserProfileResponseToSharedUserProfile = (
  res: ApiUserProfileResponse,
  opts?: { apiBaseUrl?: string | null }
): SharedUserProfile => {
  // 공용 mapper 재사용: 명세(profileImageName, M/F) 반영된 UI Profile 생성
  return mapApiUserProfileToUserProfile(res, {
    apiBaseUrl: opts?.apiBaseUrl ?? API_BASE_URL,
    fallbackId: res?.id ?? "unknown",
    fallbackNickname: res?.nickname ?? "알 수 없음",
  });
};

/**
 * auth.User(UI) 생성
 * - 서버 /users/{userId}/profile 응답을 기반으로 UI에서 안정적으로 쓰는 User로 변환
 */
export const mapUserProfileResponseToAuthUser = (
  res: ApiUserProfileResponse,
  opts?: { apiBaseUrl?: string | null }
): User => {
  const loginId = String(res?.id ?? "").trim();
  const id = normalizeId(loginId || "unknown");

  const nickname = String(res?.nickname ?? "").trim() || "알 수 없음";

  const imageName = res?.profileImageName ?? null;
  const avatarUrl = buildImageUrlFromName(imageName, opts?.apiBaseUrl ?? API_BASE_URL);

  return {
    id,
    nickname,
    avatarUrl: avatarUrl ?? null,
    avatarImageName: imageName ?? null,

    loginId: loginId || "unknown",
    gender: mapServerGenderToGender(res?.gender, "male"),
    birthDate: res?.birth ?? "",
  };
};

// 3줄 요약
// - 프로필 응답은 profileImageName + M/F 기준으로 매핑하고, /images/{filename} URL을 생성해 바로 표시 가능하게 했습니다.
// - Shared UserProfile 변환은 공용 mapApiUserProfileToUserProfile을 재사용해 타입/기본값 정책을 통일했습니다.
// - SignupRequest에 nickname을 포함시키고, login/signup 요청 필드명을 명세(id/password)로 맞췄습니다.