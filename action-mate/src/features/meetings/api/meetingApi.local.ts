// src/features/meetings/api/meetingApi.local.ts
import { MOCK_MEETINGS_SEED, HOST_USERS } from "../mocks/meetingMockData";
import { nowIso } from "@/shared/utils/timeText";
import type {
  HomeSort,
  MeetingApi,
  MeetingPost,
  Participant,
  MeetingUpsert,
  HotMeetingItem,
  MembershipStatus,
  CategoryKey,
  PostStatus,
  JoinMode,
} from "../model/types";
import type { Location } from "@/shared/model/types";

/**
 * ✅ Local Meeting API (Mock)
 *
 * 핵심 의도
 * - UI 모델(특히 location/capacity)을 "항상 안전한 형태"로 반환
 * - seed/구버전 shape은 normalizeSeedToPost에서 흡수
 * - UI에서 객체 mutate 실수로 내부 상태(_DATA)가 오염되지 않게 clone 반환
 */

// ----------------------------------------------------------------------
// ✅ 1) Helpers (반드시 _DATA 선언보다 위)
// ----------------------------------------------------------------------

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const toTimeMs = (iso?: string) => {
  if (!iso) return Number.MAX_SAFE_INTEGER;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
};

const num = (v: unknown, fallback = 0) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);

const isOneOf = <T extends string>(v: unknown, list: readonly T[]): v is T =>
  typeof v === "string" && (list as readonly string[]).includes(v);

const CATEGORY_KEYS: readonly CategoryKey[] = ["SPORTS", "GAMES", "MEAL", "STUDY", "ETC"] as const;
const STATUS_KEYS: readonly PostStatus[] = ["OPEN", "FULL", "CANCELED", "STARTED", "ENDED"] as const;
const JOIN_KEYS: readonly JoinMode[] = ["INSTANT", "APPROVAL"] as const;

const toCategoryKey = (v: unknown): CategoryKey => {
  if (isOneOf(v, CATEGORY_KEYS)) return v;
  // 구버전 seed(한글 카테고리) 방어
  if (v === "운동") return "SPORTS";
  if (v === "오락") return "GAMES";
  if (v === "식사") return "MEAL";
  return "ETC";
};

const toStatus = (v: unknown): PostStatus => (isOneOf(v, STATUS_KEYS) ? v : "OPEN");
const toJoinMode = (v: unknown): JoinMode => (isOneOf(v, JOIN_KEYS) ? v : "INSTANT");

const toNumberOrNull = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

const getLat = (loc: any): number | null =>
  toNumberOrNull(loc?.latitude ?? loc?.lat ?? loc?.y ?? loc?.Lat ?? loc?.LAT);
const getLng = (loc: any): number | null =>
  toNumberOrNull(loc?.longitude ?? loc?.lng ?? loc?.x ?? loc?.Lng ?? loc?.LNG);

function clonePost(p: MeetingPost): MeetingPost {
  return {
    ...p,
    location: p.location ? ({ ...(p.location as any) } as any) : p.location,
    capacity: p.capacity ? ({ ...(p.capacity as any) } as any) : p.capacity,
    myState: p.myState ? ({ ...(p.myState as any) } as any) : p.myState,
    host: p.host ? ({ ...(p.host as any) } as any) : p.host,
  };
}

function ensureCapacity(raw: any): MeetingPost["capacity"] {
  const max = num(
    raw?.capacity?.max ??
      raw?.capacity?.total ??
      raw?.capacityTotal ??
      raw?.capacity ??
      raw?.max ??
      4,
    4,
  );
  const current = num(
    raw?.capacity?.current ??
      raw?.currentCount ??
      raw?.capacityJoined ??
      raw?.capacityCurrent ??
      raw?.current ??
      0,
    0,
  );

  const safeMax = Math.max(1, Math.trunc(max));
  const safeCurrent = Math.max(0, Math.min(Math.trunc(current), safeMax));

  return { max: safeMax, current: safeCurrent, total: safeMax } as any;
}

function ensureLocation(raw: any): Location {
  const base = raw?.location ?? raw;

  const name = str(
    base?.name ?? raw?.locationName ?? raw?.locationText ?? raw?.place ?? "",
    "",
  ).trim();

  const latitude = getLat(base);
  const longitude = getLng(base);

  const addressRaw = base?.address ?? raw?.address;
  const address =
    addressRaw == null ? null : typeof addressRaw === "string" ? addressRaw : null;

  return {
    name: name || "장소 미정",
    latitude: latitude,
    longitude: longitude,
    address,
  };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function parseDistance(text?: string) {
  if (!text) return 999;
  const val = parseFloat(text.replace(/[^0-9.]/g, ""));
  return text.includes("m") && !text.includes("km") ? val / 1000 : val;
}

function sortList(list: MeetingPost[], sort: HomeSort, lat?: number, lng?: number) {
  return [...list].sort((a, b) => {
    if (sort === "NEAR") {
      const hasBase = typeof lat === "number" && typeof lng === "number";
      const aLat = getLat(a.location);
      const aLng = getLng(a.location);
      const bLat = getLat(b.location);
      const bLng = getLng(b.location);

      const hasA = Number.isFinite(aLat ?? NaN) && Number.isFinite(aLng ?? NaN);
      const hasB = Number.isFinite(bLat ?? NaN) && Number.isFinite(bLng ?? NaN);

      if (hasBase && hasA && hasB) {
        return (
          haversineKm(lat!, lng!, aLat as number, aLng as number) -
          haversineKm(lat!, lng!, bLat as number, bLng as number)
        );
      }
      return parseDistance(a.distanceText) - parseDistance(b.distanceText);
    }

    if (sort === "SOON") return toTimeMs(a.meetingTime) - toTimeMs(b.meetingTime);

    // LATEST
    return String(b.id).localeCompare(String(a.id));
  });
}

function calcCanJoin(post: MeetingPost): { canJoin: boolean; reason?: string } {
  if (post.status !== "OPEN") return { canJoin: false, reason: "모집 중이 아닙니다." };

  const max = num((post.capacity as any)?.max ?? (post.capacity as any)?.total, 0);
  const current = num((post.capacity as any)?.current, 0);

  if (max > 0 && current >= max) return { canJoin: false, reason: "정원이 가득 찼습니다." };
  return { canJoin: true };
}

function normalizeHost(raw: any) {
  const fallback = (HOST_USERS as any)?.me ?? {
    id: "me",
    nickname: "나",
    avatarUrl: null,
    avgRate: 0,
    orgTime: 0,
  };

  const id = str(raw?.id ?? fallback.id, fallback.id);
  const nickname = str(raw?.nickname ?? fallback.nickname, fallback.nickname);
  const avatarUrl = raw?.avatarUrl === null ? null : str(raw?.avatarUrl, "") || null;

  const avgRate = num(raw?.avgRate ?? fallback.avgRate ?? 0, 0);
  const orgTime = Math.max(0, Math.trunc(num(raw?.orgTime ?? fallback.orgTime ?? 0, 0)));

  return { id, nickname, avatarUrl, avgRate, orgTime, intro: raw?.intro } as any;
}

function normalizeMyState(raw: any, postForCalc: MeetingPost): MeetingPost["myState"] {
  const ms = raw?.myState ?? raw;
  const membershipStatus: MembershipStatus = isOneOf(ms?.membershipStatus, [
    "NONE",
    "MEMBER",
    "PENDING",
    "HOST",
    "CANCELED",
    "REJECTED",
  ] as const)
    ? ms.membershipStatus
    : "NONE";

  if (membershipStatus !== "NONE") {
    return {
      membershipStatus,
      canJoin: false,
      reason: ms?.reason ? String(ms.reason) : undefined,
    } as any;
  }

  const canJoinInfo = calcCanJoin(postForCalc);
  return {
    membershipStatus: "NONE",
    canJoin: canJoinInfo.canJoin,
    reason: canJoinInfo.reason,
  } as any;
}

function normalizeSeedToPost(raw: any): MeetingPost {
  const meetingTime = str(raw?.meetingTime ?? raw?.meetingTimeIso, nowIso());
  const location = ensureLocation(raw);
  const capacity = ensureCapacity(raw);

  const base: MeetingPost = {
    id: String(raw?.id ?? `m_${Date.now()}`),
    category: toCategoryKey(raw?.category),
    title: str(raw?.title, "").trim() || "(제목 없음)",
    content: typeof raw?.content === "string" ? raw.content : undefined,
    meetingTime,
    durationMinutes: typeof raw?.durationMinutes === "number" ? raw.durationMinutes : undefined,
    location,
    capacity,
    joinMode: toJoinMode(raw?.joinMode),
    conditions: typeof raw?.conditions === "string" ? raw.conditions : undefined,
    items: typeof raw?.items === "string" ? raw.items : undefined,
    status: toStatus(raw?.status),
    distanceText: typeof raw?.distanceText === "string" ? raw.distanceText : undefined,
    meetingTimeText: typeof raw?.meetingTimeText === "string" ? raw.meetingTimeText : undefined,
    host: raw?.host ? normalizeHost(raw.host) : undefined,
    myState: undefined,
    address: location?.address ?? undefined,
  } as any;

  return {
    ...base,
    myState: normalizeMyState(raw?.myState, base),
  };
}

// ----------------------------------------------------------------------
// ✅ 2) Data Initialization
// ----------------------------------------------------------------------

let _DATA: MeetingPost[] = (JSON.parse(JSON.stringify(MOCK_MEETINGS_SEED)) as any[]).map(normalizeSeedToPost);
const _PARTICIPANTS: Record<string, Participant[]> = {};
const _MEETING_LAST_STARS: Record<string, number> = {};

// ----------------------------------------------------------------------
// ✅ 3) Remaining Helpers
// ----------------------------------------------------------------------

const ensureParticipants = (meetingId: string) => {
  if (_PARTICIPANTS[meetingId]) return;

  _PARTICIPANTS[meetingId] = [
    {
      id: "u_test_1",
      nickname: "테니스왕",
      avatarUrl: "https://i.pravatar.cc/150?u=test1",
      status: "PENDING",
      appliedAt: new Date(Date.now() - 3600_000).toISOString(),
    },
    {
      id: "u_test_2",
      nickname: "초보에요",
      avatarUrl: null,
      status: "MEMBER",
      appliedAt: new Date(Date.now() - 7200_000).toISOString(),
    },
  ];
};

function minutesUntil(iso?: string) {
  const t = toTimeMs(iso);
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  return (t - Date.now()) / 60000;
}

function remainingSeats(post: MeetingPost) {
  const max = num((post.capacity as any)?.max ?? (post.capacity as any)?.total, 0);
  const current = num((post.capacity as any)?.current, 0);
  if (max <= 0) return 999;
  return Math.max(0, max - current);
}

function recomputeMyState(post: MeetingPost): MeetingPost["myState"] {
  const prev = post.myState as any;
  const status = prev?.membershipStatus ?? "NONE";
  if (status !== "NONE") return prev;
  return {
    membershipStatus: "NONE",
    ...calcCanJoin(post),
  } as any;
}

// ----------------------------------------------------------------------
// ✅ 4) API Export
// ----------------------------------------------------------------------

export const meetingApiLocal: MeetingApi = {
  async listHotMeetings({ limit = 6, withinMinutes = 180 } = {}): Promise<HotMeetingItem[]> {
    await delay();

    const list = _DATA
      .filter((m) => m.status === "OPEN")
      .filter((m) => remainingSeats(m) <= 2)
      .map((m) => ({ m, min: minutesUntil(m.meetingTime) }))
      .filter(({ min }) => (withinMinutes == null ? true : min >= 0 && min <= withinMinutes))
      .sort((a, b) => a.min - b.min)
      .slice(0, limit)
      .map(({ m, min }) => ({
        id: `hot-${m.id}`,
        meetingId: m.id,
        badge:
          Number.isFinite(min) && min >= 0
            ? min < 60
              ? `${Math.floor(min)}분 남음`
              : `${Math.floor(min / 60)}시간 남음`
            : "마감임박",
        title: m.title,
        location: { ...(m.location as any) },
        capacity: { ...(m.capacity as any) },
      }));

    return list;
  },

  async listMeetings({ category = "ALL", sort = "LATEST" } = {}) {
    await delay();
    const list = category === "ALL" ? _DATA : _DATA.filter((m) => m.category === category);
    return sortList(list, sort).map(clonePost);
  },

  async listMeetingsAround(lat, lng, { radiusKm = 3, category = "ALL", sort = "NEAR" } = {}) {
    await delay();

    let candidates = _DATA;
    if (category !== "ALL") candidates = candidates.filter((m) => m.category === category);

    const within = candidates
      .map((m) => {
        const mLat = getLat(m.location);
        const mLng = getLng(m.location);
        const valid = Number.isFinite(mLat ?? NaN) && Number.isFinite(mLng ?? NaN);
        const dist = valid ? haversineKm(lat, lng, mLat as number, mLng as number) : Number.POSITIVE_INFINITY;
        return { m, dist };
      })
      .filter(({ dist }) => dist <= radiusKm);

    const sorted = within.sort((a, b) => (sort === "NEAR" ? a.dist - b.dist : 0));

    return sorted.map(({ m, dist }) =>
      clonePost({
        ...m,
        distanceText: dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`,
      } as any),
    );
  },

  async getMeeting(id) {
    await delay();
    const found = _DATA.find((m) => String(m.id) === String(id));
    if (!found) throw new Error("Meeting not found");
    return clonePost(found);
  },

  async createMeeting(data: MeetingUpsert) {
    await delay(800);

    const newId = String(Date.now());
    const maxRaw = (data.capacity as any)?.max ?? (data.capacity as any)?.total ?? 4;
    const max = Math.max(1, Math.trunc(num(maxRaw, 4)));
    const current = 1; // 호스트 포함

    const loc = ensureLocation({ location: data.location });
    const host = normalizeHost((HOST_USERS as any)?.me);

    const newPost: MeetingPost = {
      id: newId,
      category: data.category,
      title: (data.title?.trim() ? data.title : "(제목 없음)") as any,
      content: data.content,
      meetingTime: data.meetingTime,
      durationMinutes: data.durationMinutes,
      location: { ...loc } as any,
      capacity: { max, current, total: max } as any,
      status: "OPEN",
      joinMode: data.joinMode,
      conditions: data.conditions,
      items: data.items,
      distanceText: "0km",
      meetingTimeText: undefined,
      host,
      myState: { membershipStatus: "HOST", canJoin: false } as any,
      address: loc.address ?? undefined,
    } as any;

    _DATA.unshift(newPost);
    return clonePost(newPost);
  },

  async updateMeeting(id, patch: Partial<MeetingUpsert>) {
    await delay(800);
    const idx = _DATA.findIndex((m) => String(m.id) === String(id));
    if (idx === -1) throw new Error("Meeting not found");

    const prev = _DATA[idx];

    const nextLocation = patch.location
      ? ({
          ...(prev.location as any),
          ...(patch.location as any),
          name: str((patch.location as any)?.name ?? prev.location?.name, prev.location?.name ?? "장소 미정"),
          latitude:
            toNumberOrNull((patch.location as any)?.latitude ?? (patch.location as any)?.lat) ??
            prev.location?.latitude ??
            null,
          longitude:
            toNumberOrNull((patch.location as any)?.longitude ?? (patch.location as any)?.lng) ??
            prev.location?.longitude ??
            null,
        } as any)
      : prev.location;

    const patchMax = (patch.capacity as any)?.max ?? (patch.capacity as any)?.total;
    const prevMax = num((prev.capacity as any)?.max ?? (prev.capacity as any)?.total, 4);
    const nextMax = typeof patchMax === "number" && Number.isFinite(patchMax) ? Math.max(1, Math.trunc(patchMax)) : prevMax;

    const prevCurrent = num((prev.capacity as any)?.current, 0);
    const nextCurrent = Math.min(prevCurrent, nextMax);

    const next: MeetingPost = {
      ...prev,
      ...patch,
      meetingTime: patch.meetingTime ?? prev.meetingTime,
      location: nextLocation as any,
      capacity: { ...(prev.capacity as any), max: nextMax, current: nextCurrent, total: nextMax } as any,
      title: (patch.title?.trim() ? patch.title : prev.title) as any,
    } as any;

    next.myState = recomputeMyState(next);
    _DATA[idx] = next;

    return clonePost(next);
  },

  async cancelMeeting(id) {
    await delay();
    const idx = _DATA.findIndex((m) => String(m.id) === String(id));
    if (idx === -1) throw new Error("Meeting not found");

    const target = _DATA[idx];
    _DATA.splice(idx, 1);

    return { post: clonePost({ ...target, status: "CANCELED" } as any) };
  },

  async joinMeeting(id) {
    await delay();
    const idx = _DATA.findIndex((m) => String(m.id) === String(id));
    if (idx < 0) throw new Error("Meeting not found");

    const target = _DATA[idx];
    const max = num((target.capacity as any)?.max ?? (target.capacity as any)?.total, 0);
    const current = num((target.capacity as any)?.current, 0);
    if (max > 0 && current >= max) throw new Error("Full");

    const isApproval = target.joinMode === "APPROVAL";
    const newStatus: MembershipStatus = isApproval ? "PENDING" : "MEMBER";
    const newCurrent = isApproval ? current : current + 1;

    const nextPost: MeetingPost = {
      ...target,
      capacity: { ...(target.capacity as any), max, current: newCurrent, total: max } as any,
      myState: { membershipStatus: newStatus, canJoin: false } as any,
    } as any;

    _DATA[idx] = nextPost;
    return { post: clonePost(nextPost), membershipStatus: newStatus };
  },

  async cancelJoin(id) {
    await delay();
    const idx = _DATA.findIndex((m) => String(m.id) === String(id));
    if (idx < 0) throw new Error("Meeting not found");

    const target = _DATA[idx];
    const max = num((target.capacity as any)?.max ?? (target.capacity as any)?.total, 0);
    const current = num((target.capacity as any)?.current, 0);
    const isMember = target.myState?.membershipStatus === "MEMBER";

    const nextPost: MeetingPost = {
      ...target,
      capacity: {
        ...(target.capacity as any),
        max,
        current: isMember ? Math.max(0, current - 1) : current,
        total: max,
      } as any,
      myState: { membershipStatus: "NONE", ...calcCanJoin(target) } as any,
    } as any;

    _DATA[idx] = nextPost;
    return { post: clonePost(nextPost) };
  },

  async getParticipants(meetingId) {
    await delay();
    const key = String(meetingId);
    ensureParticipants(key);
    return _PARTICIPANTS[key].map((p) => ({ ...(p as any) }));
  },

  async approveParticipant(meetingId, userId) {
    await delay(500);
    const key = String(meetingId);
    ensureParticipants(key);

    const list = _PARTICIPANTS[key];
    const target = list.find((p) => String(p.id) === String(userId));

    if (target && target.status === "PENDING") {
      target.status = "MEMBER";

      const mIdx = _DATA.findIndex((m) => String(m.id) === key);
      if (mIdx > -1) {
        const m = _DATA[mIdx];
        const max = num((m.capacity as any)?.max ?? (m.capacity as any)?.total, 0);
        const current = num((m.capacity as any)?.current, 0);
        const next = max > 0 ? Math.min(max, current + 1) : current + 1;

        _DATA[mIdx] = {
          ...m,
          capacity: { ...(m.capacity as any), max, current: next, total: max } as any,
        } as any;
        _DATA[mIdx].myState = recomputeMyState(_DATA[mIdx]);
      }
    }

    return list.map((p) => ({ ...(p as any) }));
  },

  async rejectParticipant(meetingId, userId) {
    await delay(500);
    const key = String(meetingId);
    ensureParticipants(key);

    const list = _PARTICIPANTS[key];
    const target = list.find((p) => String(p.id) === String(userId));
    if (target) target.status = "REJECTED";

    return list.map((p) => ({ ...(p as any) }));
  },

  async submitMeetingRating(req: { meetingId: string; stars: number }): Promise<unknown> {
    await delay(500);

    const meetingId = String(req.meetingId);
    const stars = clamp(Number(req.stars ?? 0), 1, 5);
    _MEETING_LAST_STARS[meetingId] = stars;

    const idx = _DATA.findIndex((m) => String(m.id) === meetingId);
    if (idx < 0) throw new Error("Meeting not found");

    const post = _DATA[idx];
    if (post.host) {
      post.host = {
        ...(post.host as any),
        avgRate: stars,
        orgTime: Math.max(0, Math.trunc(num((post.host as any)?.orgTime ?? 0, 0))) + 1,
      } as any;
    }

    return { ok: true, stars };
  },
};

export default {
  ...meetingApiLocal,
  __getMockDataUnsafe: () => _DATA,
};