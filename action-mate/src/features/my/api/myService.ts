// src/features/my/myService.ts
import type { MyRepository } from "../repository/MyRepository";
import { myMockRepository } from "../repository/myMockRepository";
import { myApiRepository } from "../repository/myApiRepository";

const USE_MOCK = __DEV__; // env로 변경 가능
const repo: MyRepository = USE_MOCK ? myMockRepository : myApiRepository;

export const myService = {
  getMyProfile: () => repo.getProfile(),
  updateMyProfile: (p: any) => repo.updateProfile(p),

  getMySummary: () => repo.getSummary(),

  getMyHostedMeetings: () => repo.getHostedMeetings(),
  getMyJoinedMeetings: () => repo.getJoinedMeetings(),

  updateMyHostedMeeting: (id: string, patch: any) => repo.updateHostedMeeting(id, patch),
  deleteMyHostedMeeting: (id: string) => repo.deleteHostedMeeting(id),
};
