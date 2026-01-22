// src/shared/model/types.ts

/**
 * 모든 도메인에서 공통으로 사용하는 기본 사용자 정보입니다.
 * - id: 고유 식별자
 * - nickname: 닉네임
 * - avatarUrlUrl: 프로필 이미지 경로 (기존 avatarUrl, avatarUrlUrl 통합)
 */
export type UserSummary = {
  id: string;
  nickname: string;
  avatarUrlUrl?: string | null; 
};

/**
 * 사용자의 매너 점수 및 칭찬 정보입니다.
 * - meeting, profile 등에서 공통 사용
 */
export type UserReputation = {
  mannerTemperatureerature: number; // 기존 mannerTemperature, temperature 통합
  praiseCount: number;       // 기존 praiseCount, praiseCount 통합
};