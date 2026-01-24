// src/features/auth/model/mappers.ts
import type {
  ApiUserProfileResponse,
  ExistsResponse,
  LoginRequest,
  SignupRequest,
  TokenResponse,
} from "@/shared/api/schemas";
import type { UserProfile as SharedUserProfile } from "@/shared/model/types";
import { normalizeId } from "@/shared/model/types";
import { mapGenderToServerGender, mapServerGenderToGender } from "@/shared/model/mappers";
import type { LoginInput, SignupInput, User } from "@/features/auth/model/types";

/**
 * Auth/User 쪽은 "서버 스키마와 프론트 모델의 필드명이 다름"이 핵심 리스크입니다.
 * - login: loginId -> 서버는 id
 * - signup: gender(영문) -> 서버는 한글(남/여)
 * - user profile: profileImageUrl -> 프론트는 avatarUrl로 쓰는 경우가 많음
 */

export const mapLoginInputToLoginRequest = (input: LoginInput): LoginRequest => ({
  id: input.loginId,
  password: input.password,
});

export const mapTokenResponseToTokens = (res: TokenResponse): { accessToken: string; refreshToken: string } => ({
  accessToken: res.accessToken,
  refreshToken: res.refreshToken,
});

export const mapSignupInputToSignupRequest = (input: SignupInput): SignupRequest => ({
  id: input.loginId,
  password: input.password,
  birth: input.birthDate,
  gender: mapGenderToServerGender(input.gender),
  // nickname은 OpenAPI SignupRequest에 없음 → 서버가 받는 API가 생기면 별도 처리 권장
});

export const mapExistsResponseToAvailability = (res: ExistsResponse): boolean => !res.exists;

export const mapUserProfileResponseToSharedUserProfile = (res: ApiUserProfileResponse): SharedUserProfile => ({
  id: res.id,
  nickname: res.nickname ?? "알 수 없음",
  profileImageUrl: res.profileImageUrl,
  birth: res.birth ?? "",
  gender: mapServerGenderToGender(res.gender, "male"),
  avgRate: typeof res.avgRate === "number" ? res.avgRate : 0,
  orgTime: typeof res.orgTime === "number" ? res.orgTime : 0,
});

/**
 * auth.User(UI) 생성
 * - 서버 /users/{userId}/profile 응답을 기반으로 UI에서 안정적으로 쓰는 User로 변환
 */
export const mapUserProfileResponseToAuthUser = (res: ApiUserProfileResponse): User => ({
  id: normalizeId(res.id),
  nickname: res.nickname ?? "알 수 없음",
  avatarUrl: res.profileImageUrl ?? null,

  // auth 도메인 추가 필드
  loginId: res.id,
  gender: mapServerGenderToGender(res.gender, "male"),
  birthDate: res.birth ?? "",
});