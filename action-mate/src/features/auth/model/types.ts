// src/features/auth/model/types.ts

/**
 * ✅ 정책 정리
 * - "email" 용어/필드 제거 → 전부 "loginId(아이디)"로 통일
 * - 회원가입 필수: loginId, password, nickname, gender, birthDate (5가지)
 * - 로그인 필수: loginId, password
 */

export type Gender = "male" | "female";

export type User = {
  id: string;        // ID는 string (UUID 등 대응)
  loginId: string;   // ✅ 아이디
  nickname: string;  // 닉네임
  gender: Gender;    // ✅ 필수
  birthDate: string; // ✅ "YYYY-MM-DD"
  
  // ✅ [추가] 프로필 이미지 (없을 수 있음)
  avatar?: string | null; 
};

export type ResetRequestResult = { code?: string };

export type SignupInput = {
  loginId: string;
  password: string;
  nickname: string;
  gender: Gender;
  birthDate: string; // "YYYY-MM-DD"
};

export type LoginInput = {
  loginId: string;
  password: string;
};

// ✅ [수정됨] 중복 제거 및 updateUser 필수 포함
export type AuthApi = {
  // 1. 조회 및 인증
  getUserByLoginId(loginId: string): Promise<User | null>;
  signup(input: SignupInput): Promise<User>;
  login(input: LoginInput): Promise<User>;

  // 2. 회원 정보 수정 (✅ 필수 추가)
  // Store에서 호출하므로 반드시 구현되어야 합니다.
  updateUser(loginId: string, patch: Partial<User>): Promise<User>;

  // 3. 비밀번호 관리 (구현체에 따라 선택적일 수 있다면 ?를 붙이지만, LocalApi에 구현했으므로 필수 처리)
  updatePassword(loginId: string, newPassword: string): Promise<void>;
  requestPasswordReset(loginId: string): Promise<ResetRequestResult>;
  verifyPasswordResetCode(loginId: string, code: string): Promise<void>;
  consumePasswordResetCode(loginId: string): Promise<void>;

  // 4. 세션 관리
  getCurrentLoginId(): Promise<string | null>;
  setCurrentLoginId(loginId: string): Promise<void>;
  clearCurrentLoginId(): Promise<void>;
};