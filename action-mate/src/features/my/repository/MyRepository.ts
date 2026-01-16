// src/features/my/repository/MyRepository.ts
import type { MyMeetingItem, MyProfile, MySummary } from "../types";

export interface MyRepository {
  getProfile(): Promise<MyProfile>;
  updateProfile(payload: MyProfile): Promise<MyProfile>;

  getSummary(): Promise<MySummary>;

  getHostedMeetings(): Promise<MyMeetingItem[]>;
  getJoinedMeetings(): Promise<MyMeetingItem[]>;

  updateHostedMeeting(id: string, patch: Partial<MyMeetingItem>): Promise<MyMeetingItem>;
  deleteHostedMeeting(id: string): Promise<void>;
}
