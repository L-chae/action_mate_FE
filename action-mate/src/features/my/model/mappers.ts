// src/features/my/model/mappers.ts
import type { Post, ServerProfile } from "@/shared/model/types";
import { normalizeId } from "@/shared/model/types";
import type { MyMeetingItem, MyProfile } from "@/features/my/model/types";
import type { MeetingPost } from "@/features/meetings/model/types";

/**
 * My 도메인은 "UI 모델"을 안정적으로 유지하기 위한 mapper 모음
 */

export const mapUserProfileResponseToMyProfile = (res: ServerProfile): MyProfile => ({
  id: normalizeId(res.id),
  nickname: res.nickname ?? "알 수 없음",
  avatarUrl: res.profileImageUrl ?? null,
});

export const mapMeetingPostToMyMeetingItem = (meeting: MeetingPost): MyMeetingItem => {
  const membership = meeting.myState?.membershipStatus;
  const myJoinStatus = membership === "MEMBER" ? "MEMBER" : membership === "PENDING" ? "PENDING" : undefined;

  const rawTime = typeof meeting.meetingTime === "string" ? meeting.meetingTime : "";
  const dateText = meeting.meetingTimeText ?? (rawTime.includes("T") ? rawTime.split("T")[0] : rawTime);

  return {
    id: normalizeId(meeting.id),
    title: meeting.title?.trim() ? meeting.title : "(제목 없음)",
    location: { name: meeting.location?.name?.trim() ? meeting.location.name : "장소 미정" },
    dateText,
    memberCount: Number((meeting.capacity as any)?.current ?? 0) || 0,
    myJoinStatus,
  };
};

export const mapPostToMyMeetingItem = (post: Post): MyMeetingItem => {
  const myJoinStatus =
    post.myParticipationStatus === "MEMBER"
      ? "MEMBER"
      : post.myParticipationStatus === "PENDING"
        ? "PENDING"
        : undefined;

  const rawTime = typeof post.meetingTime === "string" ? post.meetingTime : "";
  const dateText = rawTime.includes("T") ? rawTime.split("T")[0] : rawTime;

  return {
    id: normalizeId(post.id),
    title: post.title?.trim() ? post.title : "(제목 없음)",
    location: { name: post.locationName?.trim() ? post.locationName : "장소 미정" },
    dateText,
    memberCount: typeof post.currentCount === "number" ? post.currentCount : 0,
    myJoinStatus,
  };
};