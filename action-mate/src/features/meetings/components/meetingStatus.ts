// src/features/meetings/components/meetingStatus.ts
import type { MeetingPost } from "../types";
import type { Ionicons } from "@expo/vector-icons";

export type PillTone =
  | "neutral"
  | "primary"
  | "info"
  | "success"
  | "warning"
  | "error"
  | "point";

export type StatusPillToken = {
  key: string;
  label: string;
  tone: PillTone;
  iconName?: keyof typeof Ionicons.glyphMap;
  // 정렬/우선순위(숫자 낮을수록 먼저)
  order?: number;
};

export type MeetingStatusTokens = {
  // 왼쪽(내 상태/개인 상태: HOST, MEMBER, PENDING, JOIN_BLOCKED)
  left: StatusPillToken[];
  // 오른쪽(시스템 상태: FULL/ENDED/CANCELED/STARTED)
  right: StatusPillToken[];
  // 메타(선착순/승인제 등, 상태와 다른 정보)
  meta: StatusPillToken[];
  // 카드 비활성 여부
  disabled: boolean;
};

function isClosed(status: MeetingPost["status"]) {
  return status === "FULL" || status === "ENDED" || status === "CANCELED";
}

/**
 * 실서비스 추천 정책
 * - meta(joinMode): 항상 1개 노출 (선착순/승인제)
 * - right(시스템 상태): OPEN이 아닐 때만 노출 (FULL/ENDED/CANCELED/STARTED)
 * - left(내 상태/개인 상태): HOST/MEMBER/PENDING/JOIN_BLOCKED만 노출
 *   -> 기본 "모집중"은 정보 가치가 낮아 제거 (UI 과밀 방지)
 */
export function getMeetingStatusTokens(item: MeetingPost): MeetingStatusTokens {
  const my = item.myState?.membershipStatus;
  const isHost = my === "HOST";
  const isMember = my === "MEMBER";
  const isPending = my === "PENDING";

  const closed = isClosed(item.status);

  // ✅ “참여불가” = 시스템 상태가 닫힘(closed)이 아닌데 개인 조건으로 canJoin=false 인 경우
  const joinBlocked =
    !closed &&
    !item.myState?.canJoin &&
    !isHost &&
    !isMember &&
    item.status !== "STARTED";

  // ✅ 카드 비활성: 닫힌 상태 or 참여불가
  const disabled = closed || joinBlocked;

  const left: StatusPillToken[] = [];
  const right: StatusPillToken[] = [];
  const meta: StatusPillToken[] = [];

  // =========================
  // meta: 참여 방식 (항상 1개)
  // =========================
  if (item.joinMode === "INSTANT") {
    meta.push({
      key: "joinMode-instant",
      label: "선착순",
      tone: "point", // ✅ 선착순은 포인트 톤으로(상세와도 통일하기 좋음)
      iconName: "flash-outline",
      order: 1,
    });
  } else {
    meta.push({
      key: "joinMode-approval",
      label: "승인제",
      tone: "info",
      // ✅ 승인/검토 느낌을 더 직관적으로: shield-checkmark-outline 추천
      iconName: "shield-checkmark-outline",
      order: 1,
    });
  }

  // ======================================
  // left: 내 상태/개인 상태(예외만 노출)
  // ======================================
  if (isHost) {
    left.push({
      key: "mine",
      label: "내 모임",
      tone: "primary",
      iconName: "person-circle-outline",
      order: 1,
    });
  } else if (isMember) {
    left.push({
      key: "member",
      label: "참여중",
      tone: "success",
      iconName: "checkmark-circle-outline",
      order: 1,
    });
  } else if (isPending) {
    left.push({
      key: "pending",
      label: "승인 대기",
      tone: "warning",
      iconName: "time-outline",
      order: 1,
    });
  } else if (joinBlocked) {
    left.push({
      key: "blocked",
      label: "참여불가",
      tone: "neutral",
      iconName: "remove-circle-outline",
      order: 1,
    });
  }
  // ✅ 기본 "모집중(open)"은 제거: left에 아무것도 없을 수 있음

  // =========================
  // right: 시스템 상태
  // =========================
  switch (item.status) {
    case "FULL":
      right.push({
        key: "full",
        label: "정원마감",
        tone: "warning",
        iconName: "people-outline",
        order: 1,
      });
      break;

    case "CANCELED":
      right.push({
        key: "canceled",
        label: "취소됨",
        tone: "error",
        iconName: "close-circle-outline",
        order: 1,
      });
      break;

    case "ENDED":
      right.push({
        key: "ended",
        label: "종료됨",
        tone: "neutral",
        iconName: "flag-outline",
        order: 1,
      });
      break;

    case "STARTED":
      right.push({
        key: "started",
        label: "진행중",
        tone: "primary",
        iconName: "play-circle-outline",
        order: 1,
      });
      break;

    // OPEN 포함 기타 상태는 표시 안함
    default:
      break;
  }

  left.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  right.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  meta.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  return { left, right, meta, disabled };
}