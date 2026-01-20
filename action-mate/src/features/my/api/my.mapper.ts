// src/features/my/api/my.mapper.ts
import type { MyMeetingItem } from "../model/types";
import type { MeetingPost } from "@/features/meetings/model/types";

/**
 * ✅ MeetingPost -> MyMeetingItem
 * - myState.membershipStatus를 "PENDING" | "MEMBER" 기준으로 통일
 * - My 화면/MeetingDetail/홈 등에서 동일 의미를 쓰게 하는 게 유지보수에 유리
 */
export function toMyMeetingItemFromMeetingPost(m: MeetingPost): MyMeetingItem {
  const ms = (m as any)?.myState?.membershipStatus as "PENDING" | "MEMBER" | undefined;

  return {
    id: m.id,
    title: m.title,
    place: m.locationText ?? "",
    dateText: m.meetingTimeText ?? "",
    memberCount: m.capacityTotal ?? 0,
    myJoinStatus: ms === "PENDING" ? "PENDING" : ms === "MEMBER" ? "MEMBER" : undefined,
  };
}

/**
 * ✅ UI patch(MyMeetingItem) -> MeetingPost patch
 * - "내가 만든 모임" 수정용(HostedMeetingEditModal)
 * - myJoinStatus는 여기서 수정하지 않음(도메인상 join/cancel 흐름에서만 바뀌는 게 안전)
 */
export function applyMyMeetingPatchToMeetingPost(
  target: MeetingPost,
  patch: Partial<MyMeetingItem>
): MeetingPost {
  const next: MeetingPost = { ...target };

  if (typeof patch.title === "string") next.title = patch.title;
  if (typeof patch.place === "string") next.locationText = patch.place;
  if (typeof patch.dateText === "string") next.meetingTimeText = patch.dateText;
  if (typeof patch.memberCount === "number") next.capacityTotal = patch.memberCount;

  // 방어: joined가 total을 넘지 않도록
  if (typeof next.capacityJoined === "number" && typeof next.capacityTotal === "number") {
    next.capacityJoined = Math.min(next.capacityJoined, next.capacityTotal);
  }

  return next;
}
