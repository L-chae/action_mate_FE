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

  // v1.2.4 myParticipationStatus 정합
  myJoinStatus?: "HOST" | "MEMBER" | "PENDING" | "REJECTED" | "NONE";
};

/*
요약:
1) myJoinStatus를 v1.2.4 참여 상태(HOST/MEMBER/PENDING/REJECTED/NONE)에 맞춰 확장.
2) 그 외 타입은 변경 없이 유지.
3) 표시용 필드 구조(MyMeetingItem)는 그대로 두고 상태만 정합화.
*/