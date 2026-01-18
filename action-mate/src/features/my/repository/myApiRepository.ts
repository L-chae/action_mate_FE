// src/features/my/repository/myApiRepository.ts
import type { MyRepository } from "./MyRepository";
import type { MyMeetingItem, MyProfile, MySummary } from "../model/types";

/**
 * ✅ 여기서는 "API 응답 DTO"를 받아서 MyMeetingItem으로 매핑하는 구조로 가면 유지보수 최상
 * - API 바뀌면 mapper만 변경
 */
export const myApiRepository: MyRepository = {
  async getProfile(): Promise<MyProfile> {
    throw new Error("not implemented");
  },
  async updateProfile(payload: MyProfile): Promise<MyProfile> {
    throw new Error("not implemented");
  },
  async getSummary(): Promise<MySummary> {
    throw new Error("not implemented");
  },
  async getHostedMeetings(): Promise<MyMeetingItem[]> {
    throw new Error("not implemented");
  },
  async getJoinedMeetings(): Promise<MyMeetingItem[]> {
    throw new Error("not implemented");
  },
  async updateHostedMeeting(id: string, patch: Partial<MyMeetingItem>): Promise<MyMeetingItem> {
    throw new Error("not implemented");
  },
  async deleteHostedMeeting(id: string): Promise<void> {
    throw new Error("not implemented");
  },
};
