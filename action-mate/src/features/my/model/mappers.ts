// src/features/my/model/mappers.ts
import type { Post, UserProfile } from "@/shared/api/schemas";
import { normalizeId } from "@/shared/model/types";
import { endpoints } from "@/shared/api/endpoints";
import type { MyMeetingItem, MyProfile } from "@/features/my/model/types";
import type { MeetingPost } from "@/features/meetings/model/types";

/**
 * My 도메인 mapper (OpenAPI v1.2.4 정합)
 */

const img = (name?: string): string | null => (name ? endpoints.images.get(name) : null);

export const mapUserProfileResponseToMyProfile = (res: UserProfile): MyProfile => ({
  id: normalizeId(res.id),
  nickname: res.nickname?.trim() ? res.nickname : "알 수 없음",
  avatarUrl: img(res.profileImageName),
});

export const mapMeetingPostToMyMeetingItem = (meeting: MeetingPost): MyMeetingItem => {
  const membership = meeting.myState?.membershipStatus;
  const myJoinStatus = membership && membership !== "NONE" ? membership : undefined;

  const rawTime = typeof meeting.meetingTime === "string" ? meeting.meetingTime : "";
  const dateText = meeting.meetingTimeText ?? (rawTime.includes("T") ? rawTime.split("T")[0] : rawTime);

  return {
    id: normalizeId(meeting.id),
    title: meeting.title?.trim() ? meeting.title : "(제목 없음)",
    location: { name: meeting.location?.name?.trim() ? meeting.location.name : "장소 미정" },
    dateText,
    memberCount: typeof meeting.capacity?.current === "number" ? meeting.capacity.current : 0,
    myJoinStatus,
  };
};

export const mapPostToMyMeetingItem = (post: Post): MyMeetingItem => {
  const status = post.myParticipationStatus;
  const myJoinStatus = status && status !== "NONE" ? status : undefined;

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

/*
요약:
1) ServerProfile/profileImageUrl 의존 제거 → UserProfile(profileImageName) + /images 경로로 정합.
2) myJoinStatus를 v1.2.4(HOST/MEMBER/PENDING/REJECTED/NONE) 기준으로 그대로 전달.
3) memberCount는 capacity.current / currentCount를 명세 필드로 직접 사용.
*/