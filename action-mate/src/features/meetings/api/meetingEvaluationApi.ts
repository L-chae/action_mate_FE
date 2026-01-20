// src/features/meetings/api/meetingEvaluationApi.ts
import { meetingApi } from "./meetingApi";
import type {
  MannerEvaluationPayload,
  MannerEvaluationResponse,
} from "../model/evaluation.types";

/**
 * 모임 종료 후 참여자 평가(매너 온도)
 * POST /meetings/{meetingId}/evaluations
 */
export async function submitMannerEvaluation(
  payload: MannerEvaluationPayload
): Promise<MannerEvaluationResponse> {
  const { meetingId, evaluations } = payload;

  const res = await meetingApi.post<MannerEvaluationResponse>(
    `/meetings/${meetingId}/evaluations`,
    { evaluations }
  );

  return res.data;
}
