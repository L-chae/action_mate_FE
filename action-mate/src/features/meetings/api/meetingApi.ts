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
import { meetingApiLocal } from "./meetingApi.local";
import { meetingApiRemote } from "./meetingApi.remote";

/** =========================
 *  ✅ 모임 종료 후 평가(별점)
 *  - 참여자가 모임(=post)을 0~5점으로 평가
 *  - 서버가 hostTemperature(32~42)를 최종 계산해서 내려주는 구조 권장
 *  ========================= */
export type SubmitMeetingRatingReq = {
  meetingId: string;
  stars: number; // 0~5
};

export type SubmitMeetingRatingRes = {
  ok: boolean;
  hostUserId: string;
  hostTemperature: number; // 32~42 (서버 최종 반영값)
  // hasRated?: boolean; // 서버가 같이 주면 더 편함(선택)
};

// ✅ MeetingApi 인터페이스 정의
export interface MeetingApi {
  // 1. 조회
  listHotMeetings(opts?: { limit?: number; withinMinutes?: number }): Promise<HotMeetingItem[]>;
  listMeetings(params?: { category?: CategoryKey | "ALL"; sort?: HomeSort }): Promise<MeetingPost[]>;
  listMeetingsAround(lat: number, lng: number, opts?: AroundMeetingsOptions): Promise<MeetingPost[]>;
  getMeeting(id: string): Promise<MeetingPost>;

  // 2. 생성/수정/삭제
  createMeeting(data: MeetingParams): Promise<MeetingPost>;
  updateMeeting(id: string, data: MeetingParams): Promise<MeetingPost>;
  cancelMeeting(id: string): Promise<{ post: MeetingPost }>;

  // 3. 참여 상태 관리
  joinMeeting(id: string): Promise<{ post: MeetingPost; membershipStatus: MembershipStatus }>;
  cancelJoin(id: string): Promise<{ post: MeetingPost }>;

  // 4. 참여자 관리 (호스트용)
  getParticipants(meetingId: string): Promise<Participant[]>;
  approveParticipant(meetingId: string, userId: string): Promise<Participant[]>;
  rejectParticipant(meetingId: string, userId: string): Promise<Participant[]>;

  // ✅ 5. 모임 평가 (참여자 → 별점 0~5)
  submitMeetingRating(req: SubmitMeetingRatingReq): Promise<SubmitMeetingRatingRes>;
}

/** ✅ 환경변수로 Mock/Remote 자동 선택
 * - __DEV__에서만 mock 허용
 * - env가 undefined여도 안전
 * - "true"/"TRUE"/"True" 모두 허용
 */
const envUseMock = String(process.env.EXPO_PUBLIC_USE_MOCK ?? "").toLowerCase();
const USE_MOCK = __DEV__ && envUseMock === "true";

export const meetingApi: MeetingApi = USE_MOCK ? meetingApiLocal : meetingApiRemote;
