// src/features/my/model/mappers.ts
import type { ApiUserProfileResponse } from "@/shared/api/schemas";
import type { Post } from "@/shared/model/types";
import { normalizeId } from "@/shared/model/types";
import type { MyMeetingItem, MyProfile } from "@/features/my/model/types";
import type { MeetingPost } from "@/features/meetings/model/types";

/**
 * My 도메인은 서버 전용 엔드포인트가 명세에 모두 나오지 않아,
 * "실제로 앱에서 쓰는 데이터 소스(예: Post/MeetingPost)"에서 UI 모델을 만들 수 있게 mapper를 제공합니다.
 */

export const mapUserProfileResponseToMyProfile = (res: ApiUserProfileResponse): MyProfile => ({
  id: normalizeId(res.id),
  nickname: res.nickname ?? "알 수 없음",
  avatarUrl: res.profileImageUrl ?? null,
});

export const mapMeetingPostToMyMeetingItem = (meeting: MeetingPost): MyMeetingItem => {
  const membership = meeting.myState?.membershipStatus;
  const myJoinStatus = membership === "MEMBER" ? "MEMBER" : membership === "PENDING" ? "PENDING" : undefined;

  return {
    id: meeting.id,
    title: meeting.title,
    location: { name: meeting.location.name },
    dateText: meeting.meetingTimeText ?? meeting.meetingTime,
    memberCount: meeting.capacity.current,
    myJoinStatus,
  };
};

/**
 * 서버 Post에서 바로 MyMeetingItem을 만드는 경우(예: 내 글/내 신청 목록을 Post로 받는 API가 있을 때)
 * - dateText는 우선 meetingTime 그대로 두고, 필요하면 formatter로 UI 텍스트를 파생하세요.
 */
export const mapPostToMyMeetingItem = (post: Post): MyMeetingItem => {
  const myJoinStatus = post.myParticipationStatus === "MEMBER" ? "MEMBER" : post.myParticipationStatus === "PENDING" ? "PENDING" : undefined;

  return {
    id: normalizeId(post.id),
    title: post.title?.trim() ? post.title : "(제목 없음)",
    location: { name: post.locationName?.trim() ? post.locationName : "장소 미정" },
    dateText: post.meetingTime ?? "",
    memberCount: typeof post.currentCount === "number" ? post.currentCount : 0,
    myJoinStatus,
  };
};