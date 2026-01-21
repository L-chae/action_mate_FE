//2. src/features/meetings/model/tokens.ts
//"거절됨(REJECTED)" 상태에 대한 처리를 추가하여, 사용자가 거절당했을 때 명확하게 알 수 있도록 개선했습니다. (이전 코드에서는 거절 상태 처리가 없었음)
/* //💡 핵심 개선 사항
 * "거절됨(REJECTED)" 상태 추가: 승인제 모임에서 호스트가 거절했을 때, 사용자가 "왜 안 눌리지?" 하고 당황하지 않도록 "거절됨" 빨간색 뱃지를 띄워줍니다.
 * canJoin 로직 보완: joinBlocked 계산 식을 더 정교하게 만들어, "아직 오픈 상태인데 나는 참여 못 하는 상황(예: 성별 제한 등)"을 더 정확히 걸러냅니다. */

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
  left: StatusPillToken[];  // 나의 상태 (참여중, 대기중 등)
  right: StatusPillToken[]; // 모임 상태 (마감, 종료 등)
  meta: StatusPillToken[];  // 모임 속성 (선착순/승인제)
  disabled: boolean;        // 터치/참여 불가능 여부
};

/**
 * 모임 상태에 따른 UI 뱃지 생성 함수
 * (ViewModel 로직: 데이터 -> UI 토큰 변환)
 */
export function getMeetingStatusTokens(item: MeetingPost): MeetingStatusTokens {
  const my = item.myState?.membershipStatus;
  
  const isHost = my === "HOST";
  const isMember = my === "MEMBER";
  const isPending = my === "PENDING";
  const isRejected = my === "REJECTED"; // ✅ 추가됨

  // 모임 자체가 닫힌 상태인지 확인
  const isClosedStatus = ["FULL", "ENDED", "CANCELED"].includes(item.status);

  // 참여 불가능 조건 (모임이 닫혔거나, 내가 참여 불가능하거나, 거절당했거나)
  const joinBlocked = 
    !isClosedStatus && 
    !item.myState?.canJoin && 
    !isHost && !isMember && !isPending && !isRejected &&
    item.status !== "STARTED";

  // 터치 비활성화 여부 (종료/취소/거절 등)
  const disabled = isClosedStatus || joinBlocked || isRejected;

  const left: StatusPillToken[] = [];
  const right: StatusPillToken[] = [];
  const meta: StatusPillToken[] = [];

  // 1. Meta (참여 방식)
  meta.push(item.joinMode === "INSTANT" 
    ? { key: "join-inst", label: "선착순", tone: "point", iconName: "flash-outline", order: 1 }
    : { key: "join-appr", label: "승인제", tone: "info", iconName: "shield-checkmark-outline", order: 1 }
  );

  // 2. Left (나의 참여 상태)
  if (isHost) {
    left.push({ key: "mine", label: "내 모임", tone: "primary", iconName: "person-circle-outline" });
  } else if (isMember) {
    left.push({ key: "joined", label: "참여중", tone: "success", iconName: "checkmark-circle-outline" });
  } else if (isPending) {
    left.push({ key: "wait", label: "승인 대기", tone: "warning", iconName: "time-outline" });
  } else if (isRejected) {
    // ✅ 추가: 거절된 상태 표시
    left.push({ key: "rejected", label: "거절됨", tone: "error", iconName: "alert-circle-outline" });
  } else if (joinBlocked) {
    left.push({ key: "block", label: "참여불가", tone: "neutral", iconName: "remove-circle-outline" });
  }

  // 3. Right (모임의 전체 상태 - OPEN은 표시 안 함)
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
