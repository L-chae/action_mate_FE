// src/features/my/repository/my.mapper.ts
import type { MyMeetingItem } from "../types";
import type { MeetingPost } from "@/features/meetings/types";

/**
 * ✅ MeetingPost -> MyMeetingItem
 * - 참여상태:
 *   - 승인대기: PENDING
 *   - 참여완료(즉시/승인완료): MEMBER
 *
 * ※ MeetingDetailScreen에서 membershipStatus를 "MEMBER"/"PENDING"로 쓰고 있으니
 *   My 화면도 동일한 기준으로 맞추는 게 가장 안전/유지보수 좋음.
 */
export function toMyMeetingItemFromMeetingPost(m: MeetingPost): MyMeetingItem {
  const ms = (m as any)?.myState?.membershipStatus;

  return {
    id: m.id,
    title: m.title,
    place: m.locationText ?? "",
    dateText: m.meetingTimeText ?? "",
    memberCount: m.capacityTotal ?? 0,
    // ✅ 핵심 수정: JOINED 대신 MEMBER 기준으로
    myJoinStatus: ms === "PENDING" ? "PENDING" : ms === "MEMBER" ? "MEMBER" : undefined,
  };
}

/**
 * ✅ UI patch(MyMeetingItem) -> MeetingPost patch
 * - "내가 만든 모임" 수정용(HostedMeetingEditModal)
 * - 참여상태(myJoinStatus)는 MyMeetingItem에 있어도 여기선 수정하지 않음(도메인상 join/cancel에서만 변경)
 */
export function applyMyMeetingPatchToMeetingPost(
  target: MeetingPost,
  patch: Partial<MyMeetingItem>
): MeetingPost {
  const next: MeetingPost = { ...target };

  // id 변경 방지용은 호출부에서 하는 게 더 깔끔하지만, 여기서도 방어 가능
  // const { id: _ignore, ...safe } = patch;

  if (typeof patch.title === "string") next.title = patch.title;
  if (typeof patch.place === "string") next.locationText = patch.place;
  if (typeof patch.dateText === "string") next.meetingTimeText = patch.dateText;
  if (typeof patch.memberCount === "number") next.capacityTotal = patch.memberCount;

  // ✅ myJoinStatus는 여기서 반영하지 않음 (join/cancel 전용)
  // if (patch.myJoinStatus) ...

  // joined가 total보다 크면 방어(목업에서만 의미)
  if (typeof next.capacityJoined === "number" && typeof next.capacityTotal === "number") {
    next.capacityJoined = Math.min(next.capacityJoined, next.capacityTotal);
  }

  return next;
}
