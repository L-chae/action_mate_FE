// ============================================================================
// src/features/meetings/model/tokens.ts
// ============================================================================
import { Ionicons } from "@expo/vector-icons";
import type { MeetingPost } from "./types";

export type PillTone = "neutral" | "primary" | "info" | "success" | "warning" | "error" | "point";

export type StatusPillToken = {
  key: string;
  label: string;
  tone: PillTone;
  iconName?: keyof typeof Ionicons.glyphMap;
  order?: number;
};

export type MeetingStatusTokens = {
  left: StatusPillToken[]; // 내 상태(참여중/대기/거절 등)
  right: StatusPillToken[]; // 모임 상태(마감/취소/종료/진행중)
  meta: StatusPillToken[]; // 모임 속성(선착순/승인제)
  disabled: boolean; // "참여/조작 불가" 상태(카드/버튼 비활성화에 사용)
};

/**
 * ✅ 모임 상태에 따른 UI 토큰(뱃지) 생성
 * - "거절됨(REJECTED)" 명시 지원
 * - disabled는 "닫힘/대기/거절/참여불가"를 포함해 UX 혼란을 줄임
 */
export function getMeetingStatusTokens(item: MeetingPost): MeetingStatusTokens {
  const my = item.myState?.membershipStatus;

  const isHost = my === "HOST";
  const isMember = my === "MEMBER";
  const isPending = my === "PENDING";
  const isRejected = my === "REJECTED";

  const closed = ["FULL", "ENDED", "CANCELED"].includes(item.status);

  const joinBlocked =
    !closed &&
    my === "NONE" &&
    item.status !== "STARTED" &&
    item.myState != null &&
    item.myState.canJoin === false;

  const disabled = closed || isPending || isRejected || joinBlocked;

  const left: StatusPillToken[] = [];
  const right: StatusPillToken[] = [];
  const meta: StatusPillToken[] = [];

  meta.push(
    item.joinMode === "INSTANT"
      ? { key: "join-inst", label: "선착순", tone: "point", iconName: "flash-outline", order: 1 }
      : { key: "join-appr", label: "승인제", tone: "info", iconName: "shield-checkmark-outline", order: 1 },
  );

  if (isHost) left.push({ key: "mine", label: "내 모임", tone: "primary", iconName: "person-circle-outline" });
  else if (isMember) left.push({ key: "joined", label: "참여중", tone: "success", iconName: "checkmark-circle-outline" });
  else if (isPending) left.push({ key: "wait", label: "승인 대기", tone: "warning", iconName: "time-outline" });
  else if (isRejected) left.push({ key: "rejected", label: "거절됨", tone: "error", iconName: "alert-circle-outline" });
  else if (joinBlocked) left.push({ key: "block", label: "참여불가", tone: "neutral", iconName: "remove-circle-outline" });

  switch (item.status) {
    case "FULL":
      right.push({ key: "full", label: "정원마감", tone: "warning", iconName: "people-outline" });
      break;
    case "CANCELED":
      right.push({ key: "cancel", label: "취소됨", tone: "error", iconName: "close-circle-outline" });
      break;
    case "ENDED":
      right.push({ key: "end", label: "종료됨", tone: "neutral", iconName: "flag-outline" });
      break;
    case "STARTED":
      right.push({ key: "start", label: "진행중", tone: "primary", iconName: "play-circle-outline" });
      break;
  }

  return { left, right, meta, disabled };
}