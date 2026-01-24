// src/features/my/model/types.ts
import type { Location, NormalizedId, UserReputation, UserSummary } from "@/shared/model/types";

/**
 * ✅ My 도메인도 UI 모델 기준
 * - id는 NormalizedId(string)
 * - 서버 원본이 불안정하면 API 레이어에서 normalizeId 적용 후 이 타입으로 맞춥니다.
 */

export type MySummary = UserReputation;

export type MyProfile = UserSummary;

export type MyMeetingItem = {
  id: NormalizedId;
  title: string;

  // Location에서 name만 재사용(표시 필드만 필요)
  location: Pick<Location, "name">;

  dateText: string;
  memberCount: number;
  myJoinStatus?: "MEMBER" | "PENDING";
};