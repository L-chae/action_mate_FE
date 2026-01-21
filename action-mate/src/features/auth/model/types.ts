// src/features/auth/model/types.ts

export type Gender = "male" | "female";

export type User = {
  id: string;        // 고유 식별자 (PK)
  loginId: string;   // 로그인 아이디 (사용자 입력)
  nickname: string;
  gender: Gender;
  birthDate: string; // "YYYY-MM-DD"
  avatar?: string | null; 
};

export type ResetRequestResult = { code?: string };

export type SignupInput = {
  loginId: string;
  password: string;
  nickname: string;
  gender: Gender;
  birthDate: string; 
};

export type LoginInput = {
  loginId: string;
  password: string;
};

export type AuthApi = {
  // 1. 조회 및 인증
  getUserByLoginId(loginId: string): Promise<User | null>;
  signup(input: SignupInput): Promise<User>;
  
  /**
   * 로그인 성공 시 User 객체를 반환합니다.
   * (토큰 저장은 내부 구현체에서 처리됨)
   */
  login(input: LoginInput): Promise<User>;

  // 2. 회원 정보 수정
  // id: 변경할 대상 유저의 PK 또는 LoginId
  updateUser(id: string, patch: Partial<User>): Promise<User>;

  // 3. 비밀번호 및 계정 관리
  updatePassword(loginId: string, newPassword: string): Promise<void>;
  requestPasswordReset(loginId: string): Promise<ResetRequestResult>;
  verifyPasswordResetCode(loginId: string, code: string): Promise<void>;
  consumePasswordResetCode(loginId: string): Promise<void>;

  // 4. 세션 관리 (Store 복구용)
  getCurrentLoginId(): Promise<string | null>;
  setCurrentLoginId(loginId: string): Promise<void>;
  clearCurrentLoginId(): Promise<void>;
};