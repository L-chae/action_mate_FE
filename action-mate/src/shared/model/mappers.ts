// src/shared/model/mappers.ts
import type {
  ApiApplicant as ApiApplicantResponse,
  ApiMessage as ApiMessageResponse,
  ApiUserProfileResponse,
  ErrorResponse,
  MessageRoomResponse as ApiMessageRoomResponse,
  Post as ApiPost,
} from "@/shared/api/schemas";
import { endpoints } from "@/shared/api/endpoints";
import type {
  Applicant,
  ApplicantState,
  Capacity,
  CapacityRaw,
  ChatRoom,
  Gender,
  Id,
  Location,
  LocationRaw,
  Message,
  MyParticipationStatus,
  NormalizedId,
  Post,
  PostCategory,
  PostState,
  ServerGender,
  UserProfile,
  UserSummary,
  UserSummaryRaw,
} from "@/shared/model/types";
import { normalizeId } from "@/shared/model/types";

/**
 * 서버가 불안정/느릴 때 "화면이 깨지지 않게" 하기 위한 최소 mapper 세트.
 * - 화면(UI)은 반드시 UI Model만 쓰도록 유도하고
 * - 서버 응답의 흔들림은 여기서 한 번만 흡수합니다.
 */

export const ensureArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

const toStringOrNull = (v: unknown): string | null => {
  if (typeof v === "string") {
    const s = v.trim();
    return s.length > 0 ? s : null;
  }
  return null;
};

const toNumberOrNull = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const toIntOrZero = (v: unknown): number => {
  const n = toNumberOrNull(v);
  if (n == null) return 0;
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
};

export const normalizeIdSafe = (id: Id | null | undefined, fallback: Id = "unknown"): NormalizedId =>
  normalizeId(id ?? fallback);

export const buildApiUrl = (apiBaseUrl: string | null | undefined, path: string): string => {
  const p = String(path ?? "");
  if (!apiBaseUrl) return p;

  const base = String(apiBaseUrl).trim().replace(/\/+$/, "");
  if (!base) return p;

  return `${base}${p.startsWith("/") ? "" : "/"}${p}`;
};

export const buildImageUrlFromName = (
  imageName: string | null | undefined,
  apiBaseUrl?: string | null
): string | null => {
  const name = toStringOrNull(imageName);
  if (!name) return null;

  const path = endpoints.users.image(name);
  return buildApiUrl(apiBaseUrl, path);
};

export const mapServerGenderToGender = (
  g: ServerGender | null | undefined,
  fallback: Gender = "male"
): Gender => {
  if (g === "M") return "male";
  if (g === "F") return "female";
  return fallback;
};

export const mapGenderToServerGender = (g: Gender): ServerGender => (g === "male" ? "M" : "F");

/**
 * ✅ UserSummaryRaw 타입에 없는 키(writerNickname 등)를 "직접 인덱싱"하면 TS7053가 납니다.
 * - 해결: Record로 한 번 확장해 안전하게 읽기 + 옵셔널 처리
 */
const pickFromRecord = (r: Record<string, unknown>, key: string): unknown => r[key];

export const mapUserSummaryRawToUserSummary = (
  raw: UserSummaryRaw | Record<string, unknown> | null | undefined,
  opts?: { fallbackId?: Id; fallbackNickname?: string; apiBaseUrl?: string | null }
): UserSummary => {
  const fallbackId = opts?.fallbackId ?? "unknown";
  const fallbackNickname = opts?.fallbackNickname ?? "알 수 없음";

  if (!raw || !isRecord(raw)) {
    return {
      id: normalizeIdSafe(fallbackId),
      nickname: fallbackNickname,
      avatarUrl: null,
      avatarImageName: null,
    };
  }

  const r: Record<string, unknown> = raw as Record<string, unknown>;

  const id = normalizeIdSafe((r["id"] as Id | undefined) ?? fallbackId);

  const nicknameCandidate =
    toStringOrNull(r["nickname"]) ??
    toStringOrNull(pickFromRecord(r, "writerNickname")) ??
    toStringOrNull(pickFromRecord(r, "opponentNickname"));
  const nickname = nicknameCandidate ?? fallbackNickname;

  const imageName =
    toStringOrNull(pickFromRecord(r, "profileImageName")) ??
    toStringOrNull(pickFromRecord(r, "writerImageName")) ??
    toStringOrNull(pickFromRecord(r, "opponentProfileImageName"));

  const explicitUrl =
    toStringOrNull(pickFromRecord(r, "avatarUrl")) ??
    toStringOrNull(pickFromRecord(r, "profileImageUrl")) ??
    toStringOrNull(pickFromRecord(r, "writerImageUrl")) ??
    toStringOrNull(pickFromRecord(r, "opponentProfileImageUrl"));

  const avatarUrl = explicitUrl ?? buildImageUrlFromName(imageName, opts?.apiBaseUrl) ?? null;

  return { id, nickname, avatarUrl, avatarImageName: imageName ?? null };
};

export const mapLocationRawToLocation = (raw: LocationRaw | null | undefined, fallbackName = "장소 미정"): Location => {
  if (!raw || !isRecord(raw)) {
    return { name: fallbackName, latitude: null, longitude: null, address: null };
  }

  const r: Record<string, unknown> = raw as Record<string, unknown>;

  const name = toStringOrNull(r["name"]) ?? fallbackName;

  // 서버가 latitude/longitude 또는 lat/lng를 섞어 줄 수 있어 둘 다 수용
  const latitude = toNumberOrNull(r["latitude"] ?? r["lat"]);
  const longitude = toNumberOrNull(r["longitude"] ?? r["lng"]);

  const address = r["address"] === null ? null : toStringOrNull(r["address"]) ?? null;

  return { name, latitude, longitude, address };
};

export const mapCapacityRawToCapacity = (raw: CapacityRaw | null | undefined): Capacity => {
  if (!raw || !isRecord(raw)) return { current: 0, max: 0 };

  const r: Record<string, unknown> = raw as Record<string, unknown>;

  const current = toIntOrZero(r["current"]);
  const max = toIntOrZero(r["max"] ?? r["total"]);

  return { current, max };
};

export const mapErrorResponse = (err: ErrorResponse | unknown): { code: string; message: string } => {
  if (!err || !isRecord(err)) return { code: "UNKNOWN_ERROR", message: "알 수 없는 오류" };

  const r: Record<string, unknown> = err as Record<string, unknown>;

  const code = toStringOrNull(r["code"]) ?? "UNKNOWN_ERROR";
  const message = toStringOrNull(r["message"]) ?? "알 수 없는 오류";

  return { code, message };
};

// ------------------------------
// ✅ OpenAPI 응답 -> UI Model 변환
// ------------------------------
export const mapApiUserProfileToUserProfile = (
  raw: ApiUserProfileResponse | null | undefined,
  opts?: { apiBaseUrl?: string | null; fallbackId?: Id; fallbackNickname?: string }
): UserProfile => {
  const fallbackId = opts?.fallbackId ?? "unknown";
  const fallbackNickname = opts?.fallbackNickname ?? "알 수 없음";

  const id = normalizeIdSafe(raw?.id ?? fallbackId);
  const nickname = toStringOrNull(raw?.nickname) ?? fallbackNickname;

  const profileImageName = toStringOrNull(raw?.profileImageName) ?? null;
  const profileImageUrl = buildImageUrlFromName(profileImageName, opts?.apiBaseUrl);

  const birth = toStringOrNull(raw?.birth) ?? null;

  const gender = mapServerGenderToGender(raw?.gender ?? undefined, "male");

  const avgRate = typeof raw?.avgRate === "number" && Number.isFinite(raw.avgRate) ? raw.avgRate : 0;
  const orgTime = toIntOrZero(raw?.orgTime);

  return {
    id,
    nickname,
    profileImageName,
    profileImageUrl,
    birth,
    gender,
    avgRate,
    orgTime,
  };
};

const pickPostCategory = (v: unknown, fallback: PostCategory = "자유"): PostCategory => {
  return v === "운동" || v === "오락" || v === "식사" || v === "자유" ? (v as PostCategory) : fallback;
};

const pickPostState = (v: unknown, fallback: PostState = "OPEN"): PostState => {
  return v === "OPEN" || v === "STARTED" || v === "ENDED" || v === "FULL" || v === "CANCELED"
    ? (v as PostState)
    : fallback;
};

const pickMyParticipationStatus = (v: unknown, fallback: MyParticipationStatus = "NONE"): MyParticipationStatus => {
  return v === "HOST" || v === "MEMBER" || v === "PENDING" || v === "REJECTED" || v === "NONE"
    ? (v as MyParticipationStatus)
    : fallback;
};

const pickApplicantState = (v: unknown, fallback: ApplicantState = "NONE"): ApplicantState => {
  return v === "HOST" || v === "MEMBER" || v === "REJECTED" || v === "PENDING" || v === "NONE"
    ? (v as ApplicantState)
    : fallback;
};

export const mapApiPostToPost = (raw: ApiPost | null | undefined, opts?: { apiBaseUrl?: string | null }): Post => {
  const id = normalizeIdSafe(raw?.id ?? "unknown_post");

  const category = pickPostCategory(raw?.category, "자유");
  const title = toStringOrNull(raw?.title) ?? "";
  const content = toStringOrNull(raw?.content) ?? "";

  const writerId = normalizeIdSafe(raw?.writerId ?? "unknown_user");
  const writerNickname = toStringOrNull(raw?.writerNickname) ?? "알 수 없음";

  const writerImageName = toStringOrNull(raw?.writerImageName) ?? null;
  const writerImageUrl = buildImageUrlFromName(writerImageName, opts?.apiBaseUrl);

  const meetingTime = toStringOrNull(raw?.meetingTime) ?? "";
  const locationName = toStringOrNull(raw?.locationName) ?? "장소 미정";

  const longitude = toNumberOrNull(raw?.longitude);
  const latitude = toNumberOrNull(raw?.latitude);

  const currentCount = toIntOrZero(raw?.currentCount);
  const capacity = toIntOrZero(raw?.capacity);

  const state = pickPostState(raw?.state, "OPEN");
  const joinMode = raw?.joinMode === "INSTANT" || raw?.joinMode === "APPROVAL" ? raw.joinMode : "INSTANT";

  const lastModified = toStringOrNull(raw?.lastModified) ?? meetingTime;

  const myParticipationStatus = pickMyParticipationStatus(raw?.myParticipationStatus, "NONE");

  return {
    id,
    category,
    title,
    content,
    writerId,
    writerNickname,
    writerImageName,
    writerImageUrl,
    meetingTime,
    locationName,
    longitude,
    latitude,
    currentCount,
    capacity,
    state,
    joinMode,
    lastModified,
    myParticipationStatus,
  };
};

export const mapApiMessageRoomToChatRoom = (
  raw: ApiMessageRoomResponse | null | undefined,
  opts?: { apiBaseUrl?: string | null }
): ChatRoom => {
  const roomId = toIntOrZero(raw?.roomId);
  const opponentId = normalizeIdSafe(raw?.opponentId ?? "unknown_user");
  const opponentNickname = toStringOrNull(raw?.opponentNickname) ?? "알 수 없음";

  const opponentProfileImageName = toStringOrNull(raw?.opponentProfileImageName) ?? null;
  const opponentProfileImageUrl = buildImageUrlFromName(opponentProfileImageName, opts?.apiBaseUrl);

  const postId = normalizeIdSafe(raw?.postId ?? "unknown_post");
  const unReadCount = toIntOrZero(raw?.unReadCount);
  const lastMessageContent = toStringOrNull(raw?.lastMessageContent) ?? "";

  return {
    roomId,
    opponentId,
    opponentNickname,
    opponentProfileImageName,
    opponentProfileImageUrl,
    postId,
    unReadCount,
    lastMessageContent,
  };
};

export const mapApiMessageToMessage = (raw: ApiMessageResponse | null | undefined): Message => {
  const messageId = toIntOrZero(raw?.messageId);
  const roomId = toIntOrZero(raw?.roomId);
  const postId = normalizeIdSafe(raw?.postId ?? "unknown_post");
  const postTitle = toStringOrNull(raw?.postTitle) ?? "";
  const senderId = normalizeIdSafe(raw?.senderId ?? "unknown_user");
  const content = toStringOrNull(raw?.content) ?? "";

  return { messageId, roomId, postId, postTitle, senderId, content };
};

export const mapApiApplicantToApplicant = (raw: ApiApplicantResponse | null | undefined): Applicant => {
  const postId = normalizeIdSafe(raw?.postId ?? "unknown_post");
  const userId = normalizeIdSafe(raw?.userId ?? "unknown_user");
  const state = pickApplicantState(raw?.state, "NONE");
  return { postId, userId, state };
};