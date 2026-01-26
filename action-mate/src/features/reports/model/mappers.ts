// src/features/reports/model/mappers.ts
import type { ReportCreateRequest, ReportResponse } from "@/shared/api/schemas";
import { normalizeId } from "@/shared/model/types";
import type { ReportCreateInput, ReportUI } from "@/features/reports/model/types";

/**
 * Report는 UI에서 id/key로 자주 쓰이므로 NormalizedId로 통일합니다.
 */

export const mapReportCreateInputToRequest = (input: ReportCreateInput): ReportCreateRequest => ({
  targetUserId: input.targetUserId,
  postId: input.postId,
  description: input.description,
});

export const mapReportResponseToUI = (res: ReportResponse): ReportUI => ({
  id: normalizeId(res.id),
  reporterId: normalizeId(res.reporterId),
  targetUserId: normalizeId(res.targetId),
  postId: normalizeId(res.postId),
  description: res.description ?? "",
  createdAt: res.createdAt ?? "",
});