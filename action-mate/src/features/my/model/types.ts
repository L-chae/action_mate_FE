// src/features/my/model/types.ts
import type { NormalizedId, UserReputation, UserSummary } from "@/shared/model/types";

/**
 * ✅ My 도메인 UI 모델
 * - 공용 UI Model(shared/model/types.ts)을 최대한 재사용
 */

export type MySummary = UserReputation;

// MyProfile은 공용 UserSummary 그대로 사용 (id/nickname/avatarUrl/avatarImageName)
export type MyProfile = UserSummary;

export type MyJoinStatus = "MEMBER" | "PENDING";

export type MyMeetingItem = {
  id: NormalizedId;
  title: string;
  locationName: string;
  dateText: string; // YYYY-MM-DD (표시용)
  memberCount: number;
  myJoinStatus?: MyJoinStatus;
};

// 3줄 요약
// - Location Pick 대신 locationName(string)으로 단순화해 UI에서 쓰기 쉬운 형태로 정리했습니다.
// - MyProfile은 공용 UserSummary를 그대로 재사용해 중복 타입을 없앴습니다.
// - join 상태는 필요한 값만(MyJoinStatus) 남겨 화면 분기 단순화했습니다.