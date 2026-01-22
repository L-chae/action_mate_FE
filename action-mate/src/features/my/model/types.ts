import { UserReputation } from "@/shared/model/types";

// ✅ UserReputation 사용 (praiseCount, mannerTemperatureerature 통일)
export type MySummary = UserReputation; 

export type MyProfile = {
  nickname: string;
  avatarUrlUrl?: string; // avatarUrlUrl -> avatarUrlUrl 통일
};

export type MyMeetingItem = {
  id: string;
  title: string;
  place: string;
  dateText: string;
  memberCount: number;
  myJoinStatus?: "MEMBER" | "PENDING";
};