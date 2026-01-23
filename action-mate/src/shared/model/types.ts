// src/shared/model/types.ts

/**
 * 실무에서 문자열 날짜/시간은 런타임 검증이 따로 없는 경우가 많아
 * 타입 레벨에서는 "의미"만 구분하고, 실제 포맷 검증은 유효성 로직(Zod 등)에서 처리하는 편이 유지보수에 유리합니다.
 */
export type ISODateString = string; // "YYYY-MM-DD"
export type ISODateTimeString = string; // ISO 8601 string
export type Id = string;

/**
 * 공통 Gender: 여러 feature(auth 등)에서 재사용하기 위해 shared로 승격
 */
export type Gender = "male" | "female";

/**
 * 화면 전반에서 공통으로 쓰는 “유저 최소 정보”
 */
export type UserSummary = {
  id: Id;
  nickname: string;
  avatarUrl?: string | null;
};

/**
 * 유저 평판/매너 정보
 * - 프론트에서 사용하는 확정 필드명으로 통일
 */
export type UserReputation = {
  mannerTemperature: number;
  praiseCount: number;
};

/**
 * 위치/장소 (서버/클라이언트 공통 Shape)
 * - Post/Upsert 모두 동일한 구조를 쓰게 하여 변환 비용을 제거합니다.
 */
export type Location = {
  name: string;
  lat: number;
  lng: number;
};

/**
 * 정원/인원수 (서버/클라이언트 공통 Shape)
 * - 서버가 채우는 current는 Upsert에서는 선택값으로 둬서
 *   "Shape는 같지만, 서버가 무시/계산"하는 방식으로 실무 혼란을 줄입니다.
 */
export type Capacity = {
  current: number;
  total: number;
};

export type CapacityInput = {
  total: number;
  current?: number; // 서버가 무시하거나 자동 설정(예: 0)할 수 있음
};

/**
 * 백엔드 명세(UserProfile) 호환용 (필요하다면 유지)
 * - 실제 화면/도메인에서는 UserSummary/UserReputation 중심으로 쓰고
 *   백엔드 원본 스펙이 필요할 때만 참조하는 용도로 둡니다.
 */
export type UserProfile = {
  id: Id;
  birth: string;
  gender: "남" | "여";
  avgRate: number; // 서버가 주더라도, 프론트는 mannerTemperature로 매핑해서 사용
  orgTime: number;
};
