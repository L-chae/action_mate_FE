import { MOCK_MEETINGS_SEED, HOST_USERS } from "../mocks/meetingMockData";
import type {
  HomeSort,
  MeetingApi,
  MeetingPost,
  Participant,
  MeetingUpsert,
  HotMeetingItem,
} from "../model/types";

// ✅ Local State Deep Copy (seed가 구버전 shape여도 아래 normalize가 흡수)
let _DATA: MeetingPost[] = (JSON.parse(JSON.stringify(MOCK_MEETINGS_SEED)) as any[]).map(normalizeSeedToPost);

// ✅ 참여자 더미 데이터 저장소
const _PARTICIPANTS: Record<string, Participant[]> = {};

// ✅ 평가 기록 저장소 (Mock)
const _MEETING_LAST_STARS: Record<string, number> = {};

// --- Helpers ---
const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));
const toTimeMs = (iso?: string) => (iso ? new Date(iso).getTime() : Number.MAX_SAFE_INTEGER);
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const starsToTemp = (stars: number) => 36.5 + (stars - 3) * 2;

const ensureParticipants = (meetingId: string) => {
  if (!_PARTICIPANTS[meetingId]) {
    _PARTICIPANTS[meetingId] = [
      {
        id: "u_test_1",
        nickname: "테니스왕",
        avatarUrl: "https://i.pravatar.cc/150?u=test1",
        status: "PENDING",
        appliedAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "u_test_2",
        nickname: "초보에요",
        avatarUrl: null,
        status: "MEMBER",
        appliedAt: new Date(Date.now() - 7200000).toISOString(),
      },
    ];
  }
};

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
      const hasA = typeof a.location?.lat === "number" && typeof a.location?.lng === "number";
      const hasB = typeof b.location?.lat === "number" && typeof b.location?.lng === "number";

      if (hasBase && hasA && hasB) {
        return (
          haversineKm(lat!, lng!, a.location.lat, a.location.lng) -
          haversineKm(lat!, lng!, b.location.lat, b.location.lng)
        );
      }
      return parseDistance(a.distanceText) - parseDistance(b.distanceText);
    }

    if (sort === "SOON") {
      return toTimeMs(a.meetingTime) - toTimeMs(b.meetingTime);
    }

    // LATEST
    return String(b.id).localeCompare(String(a.id));
  });
}

/**
 * ✅ seed가 옛날 Flat 구조여도 런타임에서 새 shape로 정규화
 * - mockData 전부를 당장 고치지 않아도 서비스는 동작
 * - 이후 여유 있을 때 mockData를 새 shape로 바꾸면 이 함수는 제거 가능
 */
function normalizeSeedToPost(raw: any): MeetingPost {
  const meetingTime = raw?.meetingTime ?? raw?.meetingTimeIso ?? new Date().toISOString();

  const location =
    raw?.location && typeof raw.location === "object"
      ? {
          name: raw.location.name ?? raw.locationText ?? raw.place ?? "",
          lat: Number(raw.location.lat ?? raw.locationLat ?? 0),
          lng: Number(raw.location.lng ?? raw.locationLng ?? 0),
        }
      : {
          name: raw?.locationText ?? raw?.place ?? "",
          lat: Number(raw?.locationLat ?? 0),
          lng: Number(raw?.locationLng ?? 0),
        };

  const total = Number(raw?.capacity?.total ?? raw?.capacityTotal ?? 0);
  const current = Number(raw?.capacity?.current ?? raw?.capacityJoined ?? 0);

  return {
    id: String(raw?.id ?? `m_${Date.now()}`),
    category: raw?.category ?? "ETC",
    title: raw?.title ?? "",
    content: raw?.content ?? undefined,
    meetingTime,
    durationMinutes: raw?.durationMinutes ?? undefined,
    location,
    capacity: {
      total: total > 0 ? total : 4,
      current: current >= 0 ? current : 0,
    },
    joinMode: raw?.joinMode ?? "INSTANT",
    conditions: raw?.conditions ?? undefined,
    items: raw?.items ?? undefined,
    status: raw?.status ?? "OPEN",
    distanceText: raw?.distanceText ?? undefined,
    meetingTimeText: raw?.meetingTimeText ?? undefined,
    host: raw?.host ?? undefined,
    myState: raw?.myState ?? undefined,
  };
}

// ✅ Mock Implementation
export const meetingApiLocal: MeetingApi = {
  async listHotMeetings({ limit = 6, withinMinutes = 180 } = {}): Promise<HotMeetingItem[]> {
    await delay();
    const now = Date.now();

    return _DATA
      .filter((m) => m.status === "OPEN")
      .map((m) => ({ m, min: (toTimeMs(m.meetingTime) - now) / 60000 }))
      .filter(({ min }) => min >= 0 && min <= withinMinutes)
      .sort((a, b) => a.min - b.min)
      .slice(0, limit)
      .map(({ m, min }) => ({
        id: `hot-${m.id}`,
        meetingId: m.id,
        badge: min < 60 ? `${Math.floor(min)}분 남음` : `${Math.floor(min / 60)}시간 남음`,
        title: m.title,
        location: { ...m.location },
        capacity: { ...m.capacity },
      }));
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
      .map((m) => ({
        m,
        dist: haversineKm(lat, lng, m.location.lat, m.location.lng),
      }))
      .filter(({ dist }) => dist <= radiusKm);

    const sorted = within.sort((a, b) => (sort === "NEAR" ? a.dist - b.dist : 0));

    return sorted.map(({ m, dist }) => ({
      ...m,
      distanceText: dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`,
    }));
  },

  async getMeeting(id) {
    await delay();
    const found = _DATA.find((m) => m.id === id);
    if (!found) throw new Error("Meeting not found");
    return { ...found };
  },

  async createMeeting(data: MeetingUpsert) {
    await delay(800);
    const newId = String(Date.now());

    const total = Math.max(1, Number(data.capacity.total));
    const current = 1; // 호스트 포함(실무에서 보통 1부터 시작)

    const newPost: MeetingPost = {
      id: newId,
      category: data.category,
      title: data.title,
      content: data.content,
      meetingTime: data.meetingTime,
      durationMinutes: data.durationMinutes,
      location: { ...data.location },
      capacity: { total, current },
      status: "OPEN",
      joinMode: data.joinMode,
      conditions: data.conditions,
      items: data.items,
      distanceText: "0km",
      myState: { membershipStatus: "HOST", canJoin: false },
      host: HOST_USERS.me,
    };

    _DATA.unshift(newPost);
    return newPost;
  },

  async updateMeeting(id, patch: Partial<MeetingUpsert>) {
    await delay(800);
    const idx = _DATA.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error("Meeting not found");

    const prev = _DATA[idx];

    const nextLocation = patch.location
      ? { ...prev.location, ...patch.location }
      : prev.location;

    const nextTotal =
      typeof patch.capacity?.total === "number"
        ? Math.max(1, patch.capacity.total)
        : prev.capacity.total;

    const nextCurrent = Math.min(prev.capacity.current, nextTotal);

    const next: MeetingPost = {
      ...prev,
      ...patch,
      meetingTime: patch.meetingTime ?? prev.meetingTime,
      location: nextLocation,
      capacity: {
        total: nextTotal,
        current: nextCurrent,
      },
    };

    _DATA[idx] = next;
    return { ...next };
  },

  async cancelMeeting(id) {
    await delay();
    const idx = _DATA.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error("Meeting not found");

    const target = _DATA[idx];
    _DATA.splice(idx, 1);
    return { post: { ...target, status: "CANCELED" } };
  },

  async joinMeeting(id) {
    await delay();
    const idx = _DATA.findIndex((m) => m.id === id);
    if (idx < 0) throw new Error("Meeting not found");

    const target = _DATA[idx];
    if (target.capacity.current >= target.capacity.total) throw new Error("Full");

    const isApproval = target.joinMode === "APPROVAL";
    const newStatus = isApproval ? "PENDING" : "MEMBER";
    const newCount = isApproval ? target.capacity.current : target.capacity.current + 1;

    _DATA[idx] = {
      ...target,
      capacity: {
        ...target.capacity,
        current: newCount,
      },
      myState: { membershipStatus: newStatus, canJoin: false },
    };

    return { post: _DATA[idx], membershipStatus: newStatus };
  },

  async cancelJoin(id) {
    await delay();
    const idx = _DATA.findIndex((m) => m.id === id);
    if (idx < 0) throw new Error("Meeting not found");

    const target = _DATA[idx];
    const isMember = target.myState?.membershipStatus === "MEMBER";

    _DATA[idx] = {
      ...target,
      capacity: {
        ...target.capacity,
        current: isMember ? Math.max(0, target.capacity.current - 1) : target.capacity.current,
      },
      myState: { membershipStatus: "NONE", canJoin: true },
    };

    return { post: _DATA[idx] };
  },

  async getParticipants(meetingId) {
    await delay();
    ensureParticipants(meetingId);
    return [..._PARTICIPANTS[meetingId]];
  },

  async approveParticipant(meetingId, userId) {
    await delay(500);
    ensureParticipants(meetingId);

    const list = _PARTICIPANTS[meetingId];
    const target = list.find((p) => p.id === userId);
    if (target) {
      target.status = "MEMBER";
      const mIdx = _DATA.findIndex((m) => m.id === meetingId);
      if (mIdx > -1) {
        const m = _DATA[mIdx];
        const next = Math.min(m.capacity.total, m.capacity.current + 1);
        _DATA[mIdx] = { ...m, capacity: { ...m.capacity, current: next } };
      }
    }
    return [...list];
  },

  async rejectParticipant(meetingId, userId) {
    await delay(500);
    ensureParticipants(meetingId);

    const list = _PARTICIPANTS[meetingId];
    const target = list.find((p) => p.id === userId);
    if (target) target.status = "REJECTED";
    return [...list];
  },

  async submitMeetingRating(req: { meetingId: string; stars: number }): Promise<any> {
    await delay(500);

    const meetingId = String(req.meetingId);
    const stars = clamp(Number(req.stars ?? 0), 0, 5);

    const idx = _DATA.findIndex((m) => m.id === meetingId);
    if (idx < 0) throw new Error("Meeting not found");

    _MEETING_LAST_STARS[meetingId] = stars;

    const hostTemperature = starsToTemp(stars);

    if (_DATA[idx] && (_DATA[idx] as any).host) {
      (_DATA[idx] as any).host = {
        ...(_DATA[idx] as any).host,
        mannerTemperature: hostTemperature,
      };
    }

    return {
      ok: true,
      hostTemperature,
    };
  },
};

export default {
  ...meetingApiLocal,
  __getMockDataUnsafe: () => _DATA,
};