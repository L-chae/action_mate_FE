// src/features/meetings/api/meetingApi.remote.ts
import { MeetingApi } from "./meetingApi";
import type { Participant } from "../model/types";
import type {
  ParticipantEvaluation,
  MannerEvaluationResponse,
} from "../model/evaluation.types";

import { client } from "@/shared/api/client";
import { endpoints } from "@/shared/api/endpoints";

export const meetingApiRemote: MeetingApi = {
  listHotMeetings: async () => {
    throw new Error("Not Implemented");
  },
  listMeetings: async () => {
    throw new Error("Not Implemented");
  },
  listMeetingsAround: async () => {
    throw new Error("Not Implemented");
  },
  getMeeting: async () => {
    throw new Error("Not Implemented");
  },
  createMeeting: async () => {
    throw new Error("Not Implemented");
  },
  updateMeeting: async () => {
    throw new Error("Not Implemented");
  },
  joinMeeting: async () => {
    throw new Error("Not Implemented");
  },
  cancelJoin: async () => {
    throw new Error("Not Implemented");
  },
  cancelMeeting: async () => {
    throw new Error("Not Implemented");
  },

  // ✅ 참여자 목록 조회
  getParticipants: async (meetingId: string): Promise<Participant[]> => {
    const res = await client.get<Participant[]>(endpoints.posts.applicants(meetingId));
    return res.data;
  },

  // ✅ 참여 승인
  approveParticipant: async (
    meetingId: string,
    userId: string
  ): Promise<Participant[]> => {
    // decideApplicant는 "결정" 엔드포인트라 body로 approve/reject를 보내는 게 일반적
    // 백엔드가 다른 스펙이면 여기 body만 바꾸면 됨.
    const res = await client.post<Participant[]>(
      endpoints.posts.decideApplicant(meetingId, userId),
      { decision: "APPROVE" }
    );
    return res.data;
  },

  // ✅ 참여 거절
  rejectParticipant: async (
    meetingId: string,
    userId: string
  ): Promise<Participant[]> => {
    const res = await client.post<Participant[]>(
      endpoints.posts.decideApplicant(meetingId, userId),
      { decision: "REJECT" }
    );
    return res.data;
  },

  // ✅ 모임 종료 후 매너 평가 제출
  submitMannerEvaluation: async (
    meetingId: string,
    evaluations: ParticipantEvaluation[]
  ): Promise<MannerEvaluationResponse> => {
    const res = await client.post<MannerEvaluationResponse>(
      endpoints.posts.ratings(meetingId),
      { evaluations }
    );
    return res.data;
  },
};
