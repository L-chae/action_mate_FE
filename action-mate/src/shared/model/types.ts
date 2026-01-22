// src/shared/model/types.ts

export type UserSummary = {
  id: string;
  nickname: string;
  avatarUrl?: string | null; 
};

export type UserReputation = {
  // ✅ 여기서 변수명을 확정합니다.
  mannerTemperature: number; 
  praiseCount: number;
};

// 백엔드 명세(UserProfile) 호환용 (필요하다면 유지)
export type UserProfile = {
  id: string;
  birth: string;
  gender: "남" | "여";
  avgRate: number; // 백엔드는 이걸 주더라도, 프론트는 mannerTemperature로 매핑해서 씀
  orgTime: number;
};