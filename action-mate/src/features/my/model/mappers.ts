// src/features/my/model/mappers.ts
import { API_BASE_URL } from "@/shared/api/apiClient";
import type { ApiUserProfileResponse } from "@/shared/api/schemas";
import type { UserProfile } from "@/shared/model/types";
import {
  mapApiPostToPost,
  mapApiUserProfileToUserProfile,
} from "@/shared/model/mappers";
import type { Post as UiPost } from "@/shared/model/types";
import { normalizeIdSafe } from "@/shared/model/mappers";
import type { MyMeetingItem, MyProfile, MySummary } from "@/features/my/model/types";

/**
 * My 도메인은 "UI 모델"을 안정적으로 유지하기 위한 mapper 모음
 * - 서버 Raw는 shared mapper에서 1차 표준화(Post/UserProfile) 후 My 전용으로 필요한 필드만 뽑습니다.
 */

const toTitle = (v: unknown): string => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > 0 ? s : "(제목 없음)";
};

const toDateText = (isoLike: unknown): string => {
  const s = typeof isoLike === "string" ? isoLike.trim() : "";
  if (!s) return "";
  return s.includes("T") ? s.split("T")[0] ?? "" : s;
};

const toIntOrZero = (v: unknown): number => {
  if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.trunc(v));
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
  }
  return 0;
};

export const mapUserProfileResponseToMyProfile = (
  res: ApiUserProfileResponse,
  opts?: { apiBaseUrl?: string | null }
): MyProfile => {
  // ✅ shared mapper로 명세(M/F, profileImageName)를 일관되게 처리
  const p: UserProfile = mapApiUserProfileToUserProfile(res, {
    apiBaseUrl: opts?.apiBaseUrl ?? API_BASE_URL,
    fallbackId: res?.id ?? "unknown",
    fallbackNickname: res?.nickname ?? "알 수 없음",
  });

  return {
    id: p.id,
    nickname: p.nickname,
    avatarUrl: p.profileImageUrl ?? null,
    avatarImageName: p.profileImageName ?? null,
  };
};

export const mapUserProfileToMySummary = (profile: UserProfile | null | undefined): MySummary => ({
  avgRate: typeof profile?.avgRate === "number" && Number.isFinite(profile.avgRate) ? profile.avgRate : 0,
  orgTime: typeof profile?.orgTime === "number" && Number.isFinite(profile.orgTime) ? profile.orgTime : 0,
});

export const mapPostToMyMeetingItem = (post: UiPost | null | undefined): MyMeetingItem => {
  const id = normalizeIdSafe(post?.id ?? "unknown_post");
  const title = toTitle(post?.title);
  const locationName = typeof post?.locationName === "string" && post.locationName.trim()
    ? post.locationName.trim()
    : "장소 미정";

  const dateText = toDateText(post?.meetingTime);
  const memberCount = toIntOrZero(post?.currentCount);

  const myJoinStatus =
    post?.myParticipationStatus === "MEMBER"
      ? "MEMBER"
      : post?.myParticipationStatus === "PENDING"
        ? "PENDING"
        : undefined;

  return {
    id,
    title,
    locationName,
    dateText,
    memberCount,
    myJoinStatus,
  };
};

/**
 * 서버가 ApiPost를 그대로 주는 위치가 있다면(일부 화면/기능),
 * shared mapper로 UI Post로 먼저 변환 후 MyMeetingItem으로 재매핑합니다.
 */
export const mapApiPostToMyMeetingItem = (
  raw: any,
  opts?: { apiBaseUrl?: string | null }
): MyMeetingItem => {
  const uiPost = mapApiPostToPost(raw as any, { apiBaseUrl: opts?.apiBaseUrl ?? API_BASE_URL });
  return mapPostToMyMeetingItem(uiPost);
};