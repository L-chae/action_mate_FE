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
 * Auth/User mapper
 *
 * 설계 의도(왜 이렇게?):
 * - 서버 스키마 변화(필드명/nullable/타입 혼재)를 한 지점에서 흡수
 * - 화면/스토어는 UI 모델(User)만 사용하도록 강제하여 변경 영향 최소화
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

const toNumberOrZero = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export const mapUserProfileResponseToSharedUserProfile = (res: ApiUserProfileResponse): SharedUserProfile => ({
  id: res.id,
  nickname: res.nickname ?? "알 수 없음",
  profileImageUrl: res.profileImageUrl,
  birth: res.birth ?? "",
  gender: mapServerGenderToGender(res.gender, "male"),
  avgRate: toNumberOrZero(res.avgRate),
  orgTime: toNumberOrZero(res.orgTime),
});

/**
 * auth.User(UI) 생성
 * - 서버 /users/{userId}/profile 응답을 기반으로 UI에서 안정적으로 쓰는 User로 변환
 */
export const mapUserProfileResponseToAuthUser = (res: ApiUserProfileResponse): User => ({
  // UI에서 안정적으로 쓰기 위해 id는 문자열로 정규화
  id: normalizeId(res.id),
  nickname: res.nickname ?? "알 수 없음",
  avatarUrl: res.profileImageUrl ?? null,

  // auth 도메인 추가 필드
  loginId: res.id,
  gender: mapServerGenderToGender(res.gender, "male"),
  birthDate: res.birth ?? "",
});