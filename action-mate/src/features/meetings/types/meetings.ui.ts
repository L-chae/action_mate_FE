// src/features/meetings/types/meetings.ui.ts

import type {
  CategoryKey,
  JoinMode,
  PostStatus,
  MembershipStatus,
  HostSummaryDTO,
  MyStateDTO,
  MeetingDTO,
} from "./meetings.api";

// UI에서 그대로 쓰고 싶으면 DTO 타입을 재사용해도 됨
export type HostSummary = HostSummaryDTO;
export type MyState = MyStateDTO;

// ✅ 너가 기존에 쓰던 "Meeting"은 사실상 화면(UI) 모델이니까 MeetingUI로 명확히
export type MeetingUI = Omit<
  MeetingDTO,
  "meetingAt" | "distanceMeters" | "memoUpdatedAt"
> & {
  meetingTimeText: string;     // "오늘 19:00" (프론트 가공)
  distanceText?: string;       // "0.6km"     (프론트 가공)
  memoUpdatedAtText?: string;  // "3시간 전"  (프론트 가공)
};

// (선택) 기존 코드가 Meeting이라는 이름을 많이 쓰고 있으면 alias로 잠깐 유지 가능
export type Meeting = MeetingUI;

// export들도 기존처럼 필요하면 노출
export type {
  CategoryKey,
  JoinMode,
  PostStatus,
  MembershipStatus,
};
