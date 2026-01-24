// src/features/meetings/api/meetingApi.local.ts
import { MOCK_MEETINGS_SEED, HOST_USERS } from "../mocks/meetingMockData";
import type {
  HomeSort,
  MeetingApi,
  MeetingPost,
  Participant,
  MeetingUpsert,
  HotMeetingItem,
  MembershipStatus,
} from "../model/types";

/**
 * ✅ Local Meeting API (Mock)
 * - capacity는 shared Capacity(max/current)를 기반으로 사용합니다.
 * - UI에서 total을 쓰는 코드가 섞여있을 수 있어 total?: number는 optional alias로만 함께 채웁니다.
 *   (핵심은 max/current를 항상 포함하는 것)
 */

// ✅ Local State Deep Copy
let _DATA: MeetingPost[] = (JSON.parse(JSON.stringify(MOCK_MEETINGS_SEED)) as any[]).map(normalizeSeedToPost);

// ✅ 참여자 더미 데이터 저장소
const _PARTICIPANTS: Record<string, Participant[]> = {};

// ✅ 평가 기록 저장소 (Mock)
const _MEETING_LAST_STARS: Record<string, number> = {};

// --- Helpers ---
const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));
const toTimeMs = (iso?: string) => (iso ? new Date(iso).getTime() : Number.MAX_SAFE_INTEGER);
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const nowIso = () => new Date().toISOString();

const num = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const str = (v: any, fallback = "") => (typeof v === "string" ? v : fallback);

const getLat = (loc: any) => num(loc?.lat ?? loc?.latitude, 0);
const getLng = (loc: any) => num(loc?.lng ?? loc?.longitude, 0);

function ensureCapacity(raw: any): MeetingPost["capacity"] {
  // seed가 total/max/capacity 등으로 올 수 있어 모두 흡수
  const max = num(raw?.capacity?.max ?? raw?.capacity?.total ?? raw?.capacityTotal ?? raw?.capacity ?? 4, 4);
  const current = num(
    raw?.capacity?.current ?? raw?.currentCount ?? raw?.capacityJoined ?? raw?.capacityCurrent ?? 0,
    0,
  );

  const safeMax = Math.max(1, max);
  const safeCurrent = Math.max(0, Math.min(current, safeMax));

  // ✅ 중요한 규칙: max/current는 항상 포함
  // ✅ total은 UI 호환용 optional alias(있어도 되고 없어도 됨)
  return {
    max: safeMax,
    current: safeCurrent,
    total: safeMax,
  } as any;
}

function ensureLocation(raw: any) {
  const name = str(raw?.location?.name ?? raw?.locationName ?? raw?.locationText ?? raw?.place ?? "", "");
  const lat = getLat(raw?.location ?? raw);
  const lng = getLng(raw?.location ?? raw);

  return {
    name,
    lat,
    lng,
    latitude: lat,
    longitude: lng,
    address: raw?.location?.address ?? raw?.address ?? undefined,
  };
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
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

      const hasA = Number.isFinite(aLat) && Number.isFinite(aLng);
      const hasB = Number.isFinite(bLat) && Number.isFinite(bLng);

      if (hasBase && hasA && hasB) {
        return haversineKm(lat!, lng!, aLat, aLng) - haversineKm(lat!, lng!, bLat, bLng);
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

function normalizeSeedToPost(raw: any): MeetingPost {
  const meetingTime = str(raw?.meetingTime ?? raw?.meetingTimeIso, nowIso());
  const location = ensureLocation(raw);
  const capacity = ensureCapacity(raw);

  return {
    id: String(raw?.id ?? `m_${Date.now()}`),
    category: raw?.category ?? "ETC",
    title: str(raw?.title, ""),
    content: raw?.content ?? undefined,
    meetingTime,
    durationMinutes: raw?.durationMinutes ?? undefined,
    location,
    capacity,
    joinMode: raw?.joinMode ?? "INSTANT",
    conditions: raw?.conditions ?? undefined,
    items: raw?.items ?? undefined,
    status: raw?.status ?? "OPEN",
    distanceText: raw?.distanceText ?? undefined,
    meetingTimeText: raw?.meetingTimeText ?? undefined,
    host: raw?.host ?? undefined,
    myState: raw?.myState ?? { membershipStatus: "NONE", ...calcCanJoin(raw as MeetingPost) },
  };
}

const ensureParticipants = (meetingId: string) => {
  if (!_PARTICIPANTS[meetingId]) {
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
  }
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
    return sortList(list, sort);
  },

  async listMeetingsAround(lat, lng, { radiusKm = 3, category = "ALL", sort = "NEAR" } = {}) {
    await delay();

    let candidates = _DATA;
    if (category !== "ALL") candidates = candidates.filter((m) => m.category === category);

    const within = candidates
      .map((m) => {
        const mLat = getLat(m.location);
        const mLng = getLng(m.location);
        return { m, dist: haversineKm(lat, lng, mLat, mLng) };
      })
      .filter(({ dist }) => dist <= radiusKm);

    const sorted = within.sort((a, b) => (sort === "NEAR" ? a.dist - b.dist : 0));

    return sorted.map(({ m, dist }) => ({
      ...m,
      distanceText: dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`,
    }));
  },

  async getMeeting(id) {
    await delay();
    const found = _DATA.find((m) => String(m.id) === String(id));
    if (!found) throw new Error("Meeting not found");
    return { ...found };
  },

  async createMeeting(data: MeetingUpsert) {
    await delay(800);
    const newId = String(Date.now());

    const maxRaw = (data.capacity as any)?.max ?? (data.capacity as any)?.total ?? 4;
    const max = Math.max(1, num(maxRaw, 4));
    const current = 1; // 호스트 포함

    const loc = ensureLocation({ location: data.location });

    const newPost: MeetingPost = {
      id: newId,
      category: data.category,
      title: data.title,
      content: data.content,
      meetingTime: data.meetingTime,
      durationMinutes: data.durationMinutes,
      location: { ...loc } as any,
      capacity: { max, current, total: max } as any, // ✅ max/current 필수
      status: "OPEN",
      joinMode: data.joinMode,
      conditions: data.conditions,
      items: data.items,
      distanceText: "0km",
      myState: { membershipStatus: "HOST", canJoin: false },
      host: HOST_USERS.me,
    };

    _DATA.unshift(newPost);
    return { ...newPost };
  },

  async updateMeeting(id, patch: Partial<MeetingUpsert>) {
    await delay(800);
    const idx = _DATA.findIndex((m) => String(m.id) === String(id));
    if (idx === -1) throw new Error("Meeting not found");

    const prev = _DATA[idx];

    const nextLocation = patch.location ? { ...(prev.location as any), ...(patch.location as any) } : prev.location;

    const patchMax = (patch.capacity as any)?.max ?? (patch.capacity as any)?.total;
    const prevMax = num((prev.capacity as any)?.max ?? (prev.capacity as any)?.total, 4);
    const nextMax = typeof patchMax === "number" ? Math.max(1, patchMax) : prevMax;

    const prevCurrent = num((prev.capacity as any)?.current, 0);
    const nextCurrent = Math.min(prevCurrent, nextMax);

    const next: MeetingPost = {
      ...prev,
      ...patch,
      meetingTime: patch.meetingTime ?? prev.meetingTime,
      location: nextLocation as any,
      capacity: { ...(prev.capacity as any), max: nextMax, current: nextCurrent, total: nextMax } as any, // ✅ max/current 필수
    };

    _DATA[idx] = next;
    return { ...next };
  },

  async cancelMeeting(id) {
    await delay();
    const idx = _DATA.findIndex((m) => String(m.id) === String(id));
    if (idx === -1) throw new Error("Meeting not found");

    const target = _DATA[idx];
    _DATA.splice(idx, 1);

    return { post: { ...target, status: "CANCELED" } };
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

    _DATA[idx] = {
      ...target,
      capacity: { ...(target.capacity as any), max, current: newCurrent, total: max } as any, // ✅ max/current 필수
      myState: { membershipStatus: newStatus, canJoin: false },
    };

    return { post: { ..._DATA[idx] }, membershipStatus: newStatus };
  },

  async cancelJoin(id) {
    await delay();
    const idx = _DATA.findIndex((m) => String(m.id) === String(id));
    if (idx < 0) throw new Error("Meeting not found");

    const target = _DATA[idx];
    const max = num((target.capacity as any)?.max ?? (target.capacity as any)?.total, 0);
    const current = num((target.capacity as any)?.current, 0);
    const isMember = target.myState?.membershipStatus === "MEMBER";

    _DATA[idx] = {
      ...target,
      capacity: { ...(target.capacity as any), max, current: isMember ? Math.max(0, current - 1) : current, total: max } as any,
      myState: { membershipStatus: "NONE", canJoin: true },
    };

    return { post: { ..._DATA[idx] } };
  },

  async getParticipants(meetingId) {
    await delay();
    const key = String(meetingId);
    ensureParticipants(key);
    return [..._PARTICIPANTS[key]];
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

        _DATA[mIdx] = { ...m, capacity: { ...(m.capacity as any), max, current: next, total: max } as any };
      }
    }

    return [...list];
  },

  async rejectParticipant(meetingId, userId) {
    await delay(500);
    const key = String(meetingId);
    ensureParticipants(key);

    const list = _PARTICIPANTS[key];
    const target = list.find((p) => String(p.id) === String(userId));
    if (target) target.status = "REJECTED";
    return [...list];
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
      // HostSummary(UserSummary & UserReputation) 기준에서 가능한 범위만 업데이트
      post.host = {
        ...post.host,
        avgRate: stars,
        orgTime: (post.host.orgTime ?? 0) + 1,
      } as any;
    }

    return { ok: true, stars };
  },
};

export default {
  ...meetingApiLocal,
  __getMockDataUnsafe: () => _DATA,
};