// src/features/meetings/model/evaluation.types.ts

/** 0.0 ~ 5.0 (기본 0.5 step 권장) */
export type Rating = number;

/** 참여자(타겟) 1명에 대한 평가 */
export type ParticipantEvaluation = {
  targetUserId: string;
  rating: Rating;
};

/** 서버 제출 payload */
export type MannerEvaluationPayload = {
  meetingId: string;
  evaluations: ParticipantEvaluation[];
};

/** 서버 응답(예상) - 필요 없으면 안 써도 됨 */
export type MannerEvaluationResponse = {
  ok: boolean;
  meetingId: string;
  hasEvaluated: true;
};

/** 유틸: rating 안전 보정 */
export function clampRating(rating: number): Rating {
  if (Number.isNaN(rating)) return 0;
  return Math.max(0, Math.min(5, rating));
}

/** 유틸: 0.5 step으로 스냅 */
export function snapRatingToStep(rating: number, step: 0.5 | 1 = 0.5): Rating {
  const clamped = clampRating(rating);
  const snapped = Math.round(clamped / step) * step;
  // 0.5의 부동소수 오차 방지
  return Number(snapped.toFixed(1));
}
