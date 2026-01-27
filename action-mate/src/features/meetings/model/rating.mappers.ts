// src/features/meetings/model/rating.mappers.ts
import type { RatingRequest, RatingResponse } from "@/shared/api/schemas";
import { normalizeId } from "@/shared/model/types";
import type { RatingCreateInput, RatingUI } from "@/features/meetings/model/rating.types";

/**
 * Rating은 /posts/{postId}/ratings 라우트로 모임 도메인에 붙어있어 meetings 하위에 둡니다.
 */

export const mapRatingCreateInputToRequest = (input: RatingCreateInput): RatingRequest => ({
  targetUserId: input.targetUserId,
  score: input.score,
  comment: input.comment,
});

export const mapRatingResponseToUI = (res: RatingResponse): RatingUI => ({
  id: normalizeId(res.id),
  postId: normalizeId(res.postId),
  raterId: normalizeId(res.raterId),
  targetUserId: normalizeId(res.targetUserId),
  score: typeof res.score === "number" ? res.score : 0,
  comment: res.comment,
  createdAt: res.createdAt ?? "",
});
