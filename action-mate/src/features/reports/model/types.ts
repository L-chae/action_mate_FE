// src/features/reports/model/types.ts
import type { ISODateTimeString, NormalizedId } from "@/shared/model/types";

export type ReportCreateInput = {
  targetUserId: string;
  postId: number;
  description: string;
};

export type ReportUI = {
  id: NormalizedId;
  reporterId: NormalizedId;
  targetUserId: NormalizedId;
  postId: NormalizedId;
  description: string;
  createdAt: ISODateTimeString;
};