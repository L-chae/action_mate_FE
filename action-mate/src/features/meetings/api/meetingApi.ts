// src/features/meetings/api/index.ts
import { 
  MeetingPost, 
  MeetingParams, 
  HotMeetingItem, 
  CategoryKey, 
  HomeSort, 
  AroundMeetingsOptions,
  MembershipStatus,
  Participant
} from "../model/types";
import { meetingApiLocal } from "./meetingApi.local";
import { meetingApiRemote } from "./meetingApi.remote";

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
}

// ✅ 환경변수로 Mock/Remote 자동 선택
// (__DEV__일 때만 Mock 사용 가능하도록 안전장치 추가)
const USE_MOCK = __DEV__ && process.env.EXPO_PUBLIC_USE_MOCK === "true";

export const meetingApi: MeetingApi = USE_MOCK ? meetingApiLocal : meetingApiRemote;