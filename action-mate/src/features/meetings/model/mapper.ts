// src/features/meetings/model/mappers.ts
import type { PostCreateRequest, PostUpdateRequest } from "@/shared/api/schemas";
import type { Post, PostCategory, PostState } from "@/shared/model/types";
import { normalizeId } from "@/shared/model/types";
import { ensureArray } from "@/shared/model/mappers";
import type {
  CategoryKey,
  HotMeetingItem,
  MeetingPost,
  MeetingUpsert,
  MembershipStatus,
  PostStatus,
} from "@/features/meetings/model/types";
import { MEETING_UI_DEFAULTS } from "@/features/meetings/model/types";

/**
 * 서버에서는 "모임"이 /posts(Post)로 표현됩니다.
 * 따라서 Post -> MeetingPost(UI)로 정규화하는 mapper가 핵심입니다.
 */

export const mapPostCategoryToCategoryKey = (cat: PostCategory): CategoryKey => {
  switch (cat) {
    case "운동":
      return "SPORTS";
    case "오락":
      return "GAMES";
    case "식사":
      return "MEAL";
    case "자유":
      return "ETC";
    default:
      return "ETC";
  }
};

export const mapCategoryKeyToPostCategory = (key: CategoryKey): PostCategory => {
  switch (key) {
    case "SPORTS":
      return "운동";
    case "GAMES":
      return "오락";
    case "MEAL":
      return "식사";
    case "STUDY":
      // 서버에 STUDY가 없으므로 자유로 매핑(정책)
      return "자유";
    case "ETC":
    default:
      return "자유";
  }
};

export const mapPostStateToPostStatus = (state: PostState): PostStatus => {
  // 이름은 같고 순서만 달라 실질적으로 동일
  return state as unknown as PostStatus;
};

const mapMyParticipationToMembershipStatus = (v: Post["myParticipationStatus"] | undefined): MembershipStatus => {
  switch (v) {
    case "HOST":
      return "HOST";
    case "MEMBER":
      return "MEMBER";
    case "PENDING":
      return "PENDING";
    case "NONE":
    default:
      return "NONE";
  }
};

const computeCanJoin = (post: Post): { canJoin: boolean; reason?: string } => {
  if (post.state !== "OPEN") return { canJoin: false, reason: "모집 중이 아닙니다." };
  if (post.myParticipationStatus && post.myParticipationStatus !== "NONE") {
    return { canJoin: false, reason: "이미 참여 상태입니다." };
  }

  const max = typeof post.capacity === "number" ? post.capacity : 0;
  const current = typeof post.currentCount === "number" ? post.currentCount : 0;
  if (max > 0 && current >= max) return { canJoin: false, reason: "정원이 가득 찼습니다." };

  return { canJoin: true };
};

/**
 * ✅ Post(서버) -> MeetingPost(UI)
 * - UI에서 바로 써도 깨지지 않도록 기본값/표준화 적용
 */
export const mapPostToMeetingPost = (post: Post): MeetingPost => {
  const title = post.title?.trim() ? post.title : MEETING_UI_DEFAULTS.title;
  const locationName = post.locationName?.trim() ? post.locationName : MEETING_UI_DEFAULTS.locationName;

  const capacityMax = typeof post.capacity === "number" ? post.capacity : MEETING_UI_DEFAULTS.capacity.max;
  const capacityCurrent =
    typeof post.currentCount === "number" ? post.currentCount : MEETING_UI_DEFAULTS.capacity.current;

  const { canJoin, reason } = computeCanJoin(post);

  return {
    id: normalizeId(post.id),
    status: mapPostStateToPostStatus(post.state),

    category: mapPostCategoryToCategoryKey(post.category),
    title,
    content: post.content ?? "",

    meetingTime: post.meetingTime,

    // 서버 Post에는 durationMinutes 개념이 없음
    durationMinutes: undefined,

    location: {
      name: locationName,
      latitude: typeof post.latitude === "number" ? post.latitude : null,
      longitude: typeof post.longitude === "number" ? post.longitude : null,
      address: null,
    },

    capacity: {
      current: Math.max(0, Math.trunc(capacityCurrent)),
      max: Math.max(0, Math.trunc(capacityMax)),
    },

    joinMode: post.joinMode,

    // 서버가 주는 텍스트가 없어 UI에서 필요 시 파생
    meetingTimeText: undefined,
    distanceText: undefined,

    // 서버에 평판 데이터 없음 → 0 기본값으로 "UI 타입 보장"
    host: {
      id: normalizeId(post.writerId),
      nickname: post.writerNickname ?? "알 수 없음",
      avatarUrl: post.writerImageUrl ?? null,
      avgRate: 0,
      orgTime: 0,
    },

    myState: {
      membershipStatus: mapMyParticipationToMembershipStatus(post.myParticipationStatus),
      canJoin,
      reason,
    },
  };
};

export const mapPostsToMeetingPosts = (value: Post | Post[] | null | undefined): MeetingPost[] =>
  ensureArray(value).map(mapPostToMeetingPost);

/**
 * ✅ Hot(Post[]) -> HotMeetingItem[]
 * - badge 규칙: 남은 자리 2 이하 => "HOT"
 */
export const mapPostToHotMeetingItem = (post: Post): HotMeetingItem => {
  const meeting = mapPostToMeetingPost(post);
  const remaining = meeting.capacity.max - meeting.capacity.current;

  return {
    id: meeting.id, // 서버에 별도 hot-item id가 없으므로 meetingId를 재사용(정책)
    meetingId: meeting.id,
    badge: remaining <= 2 ? "HOT" : "",
    title: meeting.title,
    location: meeting.location,
    capacity: meeting.capacity,
  };
};

export const mapHotPostsToHotMeetingItems = (posts: Post[] | null | undefined): HotMeetingItem[] =>
  ensureArray(posts).map(mapPostToHotMeetingItem);

/**
 * ✅ MeetingUpsert(UI) -> PostCreateRequest(서버)
 * - 서버는 좌표를 number로 요구: latitude/longitude가 null이면 호출 전에 막는 게 안전
 * - 여기서는 "최소한의 안전장치"로 null이면 0을 넣되, 실서비스에선 유효성 검사로 차단 권장
 */
export const mapMeetingUpsertToPostCreateRequest = (data: MeetingUpsert): PostCreateRequest => ({
  category: mapCategoryKeyToPostCategory(data.category),
  title: data.title,
  content: data.content ?? "",
  meetingTime: data.meetingTime,

  locationName: data.location.name,
  latitude: data.location.latitude ?? 0,
  longitude: data.location.longitude ?? 0,

  capacity: data.capacity.max,
  joinMode: data.joinMode,
});

/**
 * ✅ Partial<MeetingUpsert>(UI) -> PostUpdateRequest(서버)
 * - undefined는 보내지 않음(서버가 null/빈값으로 덮어쓰는 사고 방지)
 */
export const mapMeetingPatchToPostUpdateRequest = (patch: Partial<MeetingUpsert>): PostUpdateRequest => {
  const req: PostUpdateRequest = {};

  if (patch.category) req.category = mapCategoryKeyToPostCategory(patch.category);
  if (typeof patch.title === "string") req.title = patch.title;
  if (typeof patch.content === "string") req.content = patch.content;
  if (typeof patch.meetingTime === "string") req.meetingTime = patch.meetingTime;

  if (patch.location) {
    if (typeof patch.location.name === "string") req.locationName = patch.location.name;
    if (typeof patch.location.latitude === "number") req.latitude = patch.location.latitude;
    if (typeof patch.location.longitude === "number") req.longitude = patch.location.longitude;
  }

  if (patch.capacity) {
    if (typeof patch.capacity.max === "number") req.capacity = patch.capacity.max;
    if (typeof patch.capacity.current === "number") {
      // 서버 스펙에 currentCount 업데이트 필드가 없으므로 무시(정책)
      // 필요 시 백엔드에 patch 지원 요청 권장
    }
  }

  if (patch.joinMode) req.joinMode = patch.joinMode;

  // MeetingUpsert에는 status/state가 없으므로 여기서는 다루지 않음

  return req;
};