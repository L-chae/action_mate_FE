// src/features/meetings/model/rating.types.ts
import type { ISODateTimeString, NormalizedId } from "@/shared/model/types";

export type RatingCreateInput = {
  postId: number;
  targetUserId: string;
  score: number; // 1~5
  comment?: string;
};

export type RatingUI = {
  id: NormalizedId;
  postId: NormalizedId;
  raterId: NormalizedId;
  targetUserId: NormalizedId;
  score: number;
  comment?: string;
  createdAt: ISODateTimeString;
};