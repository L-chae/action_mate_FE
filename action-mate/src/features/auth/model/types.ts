// src/features/auth/model/types.ts
import type {
  Gender as SharedGender,
  ISODateString,
  Id,
  UserSummary,
} from "@/shared/model/types";

/**
 * ✅ Raw vs UI 분리 전략
 * - Auth 도메인은 "UI 안정화된 UserSummary(id: string)"를 기본으로 사용합니다.
 * - 서버에서 id가 number로 내려오면 API 레이어에서 normalizeId로 문자열로 바꾼 뒤 User로 만듭니다.
 */

/**
 * 기존 import 경로/사용처 변경을 최소화하기 위해 auth에서도 Gender를 유지(재노출)합니다.
 */
export type Gender = SharedGender;

/**
 * UserSummary를 확장해 auth에서 필요한 상세 필드만 추가
 * - UI에서 안정적으로 쓰기 위해 required 유지(서버 불안정은 API 레이어에서 기본값/검증)
 */
export type User = UserSummary & {
  loginId: string; // 로그인 아이디
  gender: Gender;
  birthDate: ISODateString; // "YYYY-MM-DD"
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
   * ✅ API 호출 파라미터는 유연하게(Id 허용)
   * - 내부에서 normalizeId를 거쳐 UI User로 반환하는 흐름 권장
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