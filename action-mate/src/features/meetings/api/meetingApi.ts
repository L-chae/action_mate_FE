// src/features/meetings/api/meetingApi.ts
import {
  MeetingPost,
  MeetingParams,
  HotMeetingItem,
  CategoryKey,
  HomeSort,
  AroundMeetingsOptions,
  MembershipStatus,
  Participant,
} from "../model/types";
import type {
  ParticipantEvaluation,
  MannerEvaluationResponse,
} from "../model/evaluation.types";
import { meetingApiLocal } from "./meetingApi.local";
import { meetingApiRemote } from "./meetingApi.remote";

// ✅ 1. API 인터페이스 정의
export interface MeetingApi {
  listHotMeetings(opts?: { limit?: number; withinMinutes?: number }): Promise<HotMeetingItem[]>;

  listMeetings(params?: { category?: CategoryKey | "ALL"; sort?: HomeSort }): Promise<MeetingPost[]>;

  listMeetingsAround(
    lat: number,
    lng: number,
    opts?: AroundMeetingsOptions
  ): Promise<MeetingPost[]>;

  getMeeting(id: string): Promise<MeetingPost>;

  createMeeting(data: MeetingParams): Promise<MeetingPost>;

  updateMeeting(id: string, data: MeetingParams): Promise<MeetingPost>;

  joinMeeting(
    id: string
  ): Promise<{ post: MeetingPost; membershipStatus: MembershipStatus }>;

  cancelJoin(id: string): Promise<{ post: MeetingPost }>;

  cancelMeeting(id: string): Promise<{ post: MeetingPost }>;

  // ✅ [신규] 참여자 관리 메서드
  getParticipants(meetingId: string): Promise<Participant[]>;

  approveParticipant(meetingId: string, userId: string): Promise<Participant[]>;

  rejectParticipant(meetingId: string, userId: string): Promise<Participant[]>;

  // ✅ [신규] 모임 종료 후 매너 평가 제출
  submitMannerEvaluation(
    meetingId: string,
    evaluations: ParticipantEvaluation[]
  ): Promise<MannerEvaluationResponse>;
}

// ✅ 2. 구현체 선택 (환경변수나 설정값으로 제어 가능)
const USE_MOCK = true;

export const meetingApi: MeetingApi = USE_MOCK ? meetingApiLocal : meetingApiRemote;
