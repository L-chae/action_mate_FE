// src/features/auth/model/mappers.ts
import type { ExistsResponse, LoginRequest, SignupRequest, TokenResponse, UserProfile } from "@/shared/api/schemas";
import type { UserProfile as SharedUserProfile } from "@/shared/model/types";
import { normalizeId } from "@/shared/model/types";
import { mapGenderToServerGender, mapServerGenderToGender } from "@/shared/model/mappers";
import type { LoginInput, SignupInput, User } from "@/features/auth/model/types";

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
  birth: input.birthDate || undefined,
  gender: mapGenderToServerGender(input.gender),
  nickname: input.nickname,
});

export const mapExistsResponseToAvailability = (res: ExistsResponse): boolean => !res.exists;

const toNumberOrZero = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

const toImageUrlFromName = (name?: string): string | undefined => {
  const filename = name?.trim();
  if (!filename) return undefined;
  return `/api/images/${encodeURIComponent(filename)}`;
};

export const mapUserProfileResponseToSharedUserProfile = (res: UserProfile): SharedUserProfile => ({
  id: res.id,
  nickname: res.nickname ?? "알 수 없음",
  profileImageUrl: toImageUrlFromName(res.profileImageName),
  birth: res.birth ?? "",
  gender: mapServerGenderToGender(res.gender, "male"),
  avgRate: toNumberOrZero(res.avgRate),
  orgTime: toNumberOrZero(res.orgTime),
});

export const mapUserProfileResponseToAuthUser = (res: UserProfile): User => ({
  id: normalizeId(res.id),
  nickname: res.nickname ?? "알 수 없음",

  loginId: res.id,
  gender: mapServerGenderToGender(res.gender, "male"),
  birthDate: res.birth ?? "",

  avatarUrl: toImageUrlFromName(res.profileImageName) ?? null,
});

type UserUpdateRequest = Partial<{
  nickname: string;
  birth: string;
  gender: string;
  profileImageName: string | null;
}>;

function extractProfileImageNameFromAvatarUrl(avatarUrl?: string | null): string | null | undefined {
  if (avatarUrl === null) return null;
  const url = String(avatarUrl ?? "").trim();
  if (!url) return undefined;

  // 서버가 내려주는 형식: /api/images/{filename}
  const marker = "/api/images/";
  const idx = url.indexOf(marker);
  if (idx >= 0) {
    const encoded = url.slice(idx + marker.length);
    if (!encoded) return undefined;
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  }

  // 로컬 URI(file://, content://)는 업로드 API 없이는 서버 필드로 변환 불가 → 제외
  if (url.startsWith("file://") || url.startsWith("content://")) return undefined;

  // 그 외는 서버가 이해하는 filename일 수도 있으나 안전하게 제외(실수 방지)
  return undefined;
}

function trimOrUndef(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s ? s : undefined;
}

export const mapAuthUserPatchToUserUpdateRequest = (patch: Partial<User>): UserUpdateRequest => {
  const req: UserUpdateRequest = {};

  const nickname = trimOrUndef((patch as any)?.nickname);
  if (nickname) req.nickname = nickname;

  // User.birthDate => server.birth
  if (typeof (patch as any)?.birthDate === "string") {
    const b = (patch as any).birthDate.trim();
    // 빈 문자열은 서버가 허용한다면 빈 문자열로 보낼 수도 있으나,
    // 일반적으로 "미설정"은 undefined로 보내는 편이 안전
    if (b) req.birth = b;
  }

  if ((patch as any)?.gender) {
    try {
      req.gender = mapGenderToServerGender((patch as any).gender);
    } catch {
      // ignore
    }
  }

  const profileImageName = extractProfileImageNameFromAvatarUrl((patch as any)?.avatarUrl);
  if (profileImageName !== undefined) req.profileImageName = profileImageName;

  return req;
};
