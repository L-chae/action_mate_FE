// src/features/auth/model/types.ts
import type { Gender as SharedGender, ISODateString, Id, UserSummary } from "@/shared/model/types";

/**
 * Auth 도메인 타입
 * - UI에서는 UserSummary(id: NormalizedId) 기반 User를 사용
 * - 서버 스키마/불안정성은 API 레이어(Mapper)에서 흡수
 */
export type Gender = SharedGender;

export type User = UserSummary & {
  loginId: string; // 로그인 아이디(서버 명세상 id가 loginId 역할)
  gender: Gender;
  birthDate: ISODateString; // "YYYY-MM-DD" (서버가 비워줄 수 있어도 일단 string으로 수용)
};

export type SignupInput = {
  loginId: string;
  password: string;
  nickname: string;
  gender: Gender;
  birthDate: ISODateString;
};

export type LoginInput = {
  loginId: string;
  password: string;
};

export type ResetRequestResult = { code?: string };

export type AuthApi = {
  checkLoginIdAvailability(loginId: string): Promise<boolean>;
  getUserByLoginId(loginId: string): Promise<User | null>;
  signup(input: SignupInput): Promise<User>;
  login(input: LoginInput): Promise<User>;

  /**
   * API 호출 파라미터는 유연하게(Id 허용)
   * - 서버 명세에 user update가 없으므로 remote에서는 throw
   * - local mock에서는 구현되어 있음
   */
  updateUser(id: Id, patch: Partial<User>): Promise<User>;

  updatePassword(loginId: string, newPassword: string): Promise<void>;
  requestPasswordReset(loginId: string): Promise<ResetRequestResult>;
  verifyPasswordResetCode(loginId: string, code: string): Promise<void>;
  consumePasswordResetCode(loginId: string): Promise<void>;

  getCurrentLoginId(): Promise<string | null>;
  setCurrentLoginId(loginId: string): Promise<void>;
  clearCurrentLoginId(): Promise<void>;
};

// 3줄 요약
// - User는 공용 UserSummary(avatarUrl/avatarImageName 포함) 기반으로 유지해 화면에서 이미지/닉네임을 안정적으로 사용합니다.
// - 서버 명세상 id가 loginId 역할이므로 loginId는 string으로 유지합니다.
// - 나머지 AuthApi 시그니처는 기존 호출부 호환을 위해 유지했습니다.