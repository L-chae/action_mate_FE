// src/features/my/model/types.ts
import type { Id, Location, UserReputation, UserSummary } from "@/shared/model/types";

/**
 * 내 요약 정보는 평판 타입을 그대로 사용
 */
export type MySummary = UserReputation;

/**
 * MyProfile은 "유저 요약"과 동일한 shape가 가장 실무에서 덜 헷갈립니다.
 * - 기존에는 id가 빠져 있었는데, id가 빠지면 결국 다른 곳에서 또 들고 다니게 되어 중복이 생깁니다.
 */
export type MyProfile = UserSummary;

/**
 * MyMeetingItem도 location을 Meeting 도메인과 동일한 구조로 통일
 */
export type MyMeetingItem = {
  id: Id;
  title: string;

  // ✅ place(string) 대신 location.name으로 통일
  location: Pick<Location, "name">;

  dateText: string;
  memberCount: number;
  myJoinStatus?: "MEMBER" | "PENDING";
};