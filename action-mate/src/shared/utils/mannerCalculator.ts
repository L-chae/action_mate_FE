/**
 * ✅ 매너온도 계산기 (Single Source of Truth)
 * - 공식: 32 + (평점 * 2)
 * - 범위: 32도 ~ 42도
 * * [정책]
 * - 신규 유저(평점 0 or null)는 "36.5도(2.25점)"부터 시작합니다.
 * - 따라서 입력값이 0 이하면 자동으로 2.25로 보정합니다.
 */
export function calculateMannerTemp(avgRate: number | undefined | null): string {
  let rate = Number(avgRate);

  // ✅ [핵심 수정] 평점이 없거나 0점이면 -> 기본값 2.25점 (36.5도) 적용
  if (!Number.isFinite(rate) || rate <= 0) {
    rate = 2.25; 
  }

  // 0~5 사이로 안전하게 제한
  const safeRate = Math.max(0, Math.min(5, rate));
  
  // 공식 적용: 32 + (2.25 * 2) = 36.5
  const temp = 32 + (safeRate * 2);
  
  return temp.toFixed(1);
}