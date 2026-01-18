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
  left: StatusPillToken[];
  right: StatusPillToken[];
  meta: StatusPillToken[];
  disabled: boolean;
};

/**
 * 모임 상태에 따른 UI 토큰(뱃지) 생성
 */
export function getMeetingStatusTokens(item: MeetingPost): MeetingStatusTokens {
  const my = item.myState?.membershipStatus;
  const isHost = my === "HOST";
  const isMember = my === "MEMBER";
  const isPending = my === "PENDING";
  
  const closed = ["FULL", "ENDED", "CANCELED"].includes(item.status);
  
  // 참여 불가 조건: 닫히진 않았으나 내가 참여할 수 없는 상태 (호스트/멤버 제외)
  const joinBlocked = !closed && !item.myState?.canJoin && !isHost && !isMember && item.status !== "STARTED";
  const disabled = closed || joinBlocked;

  const left: StatusPillToken[] = [];
  const right: StatusPillToken[] = [];
  const meta: StatusPillToken[] = [];

  // 1. Meta (참여 방식)
  meta.push(item.joinMode === "INSTANT" 
    ? { key: "join-inst", label: "선착순", tone: "point", iconName: "flash-outline", order: 1 }
    : { key: "join-appr", label: "승인제", tone: "info", iconName: "shield-checkmark-outline", order: 1 }
  );

  // 2. Left (내 상태)
  if (isHost) left.push({ key: "mine", label: "내 모임", tone: "primary", iconName: "person-circle-outline" });
  else if (isMember) left.push({ key: "joined", label: "참여중", tone: "success", iconName: "checkmark-circle-outline" });
  else if (isPending) left.push({ key: "wait", label: "승인 대기", tone: "warning", iconName: "time-outline" });
  else if (joinBlocked) left.push({ key: "block", label: "참여불가", tone: "neutral", iconName: "remove-circle-outline" });

  // 3. Right (시스템 상태 - OPEN 제외)
  switch (item.status) {
    case "FULL": right.push({ key: "full", label: "정원마감", tone: "warning", iconName: "people-outline" }); break;
    case "CANCELED": right.push({ key: "cancel", label: "취소됨", tone: "error", iconName: "close-circle-outline" }); break;
    case "ENDED": right.push({ key: "end", label: "종료됨", tone: "neutral", iconName: "flag-outline" }); break;
    case "STARTED": right.push({ key: "start", label: "진행중", tone: "primary", iconName: "play-circle-outline" }); break;
  }

  return { left, right, meta, disabled };
}