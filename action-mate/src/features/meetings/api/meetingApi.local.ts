// src/features/meetings/api/meetingApi.local.ts
import { MOCK_MEETINGS_SEED, HOST_USERS } from "../mocks/meetingMockData";
import type { HomeSort, MeetingPost, Participant } from "../model/types";
import type {
  MeetingApi,
  SubmitMeetingRatingReq,
  SubmitMeetingRatingRes,
} from "./meetingApi";

let _DATA: MeetingPost[] = JSON.parse(JSON.stringify(MOCK_MEETINGS_SEED));

const _PARTICIPANTS: Record<string, Participant[]> = {};

const _MEETING_LAST_STARS: Record<string, number> = {};

export function __getMockDataUnsafe(): MeetingPost[] {
  return _DATA;
}

export function __resetMockData(): void {
  _DATA = JSON.parse(JSON.stringify(MOCK_MEETINGS_SEED));
  for (const k of Object.keys(_PARTICIPANTS)) delete _PARTICIPANTS[k];
  for (const k of Object.keys(_MEETING_LAST_STARS)) delete _MEETING_LAST_STARS[k];
}

export function __setMockData(next: MeetingPost[]): void {
  _DATA = JSON.parse(JSON.stringify(next));
  for (const k of Object.keys(_PARTICIPANTS)) delete _PARTICIPANTS[k];
  for (const k of Object.keys(_MEETING_LAST_STARS)) delete _MEETING_LAST_STARS[k];
}

const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));
const toTimeMs = (iso?: string) => (iso ? new Date(iso).getTime() : Number.MAX_SAFE_INTEGER);

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const starsToTemp = (stars: number) => {

 const s = clamp(stars, 0, 5);
  return 32 + (s / 5) * 10;
};

const ensureParticipants = (meetingId: string) => {
  if (!_PARTICIPANTS[meetingId]) {
    _PARTICIPANTS[meetingId] = [
      {
        userId: "u_test_1",
        nickname: "테니스왕",
        avatar: "https://i.pravatar.cc/150?u=test1",
        status: "PENDING",
        appliedAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        userId: "u_test_2",
        nickname: "초보에요",
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
      const hasLatLng =
        lat !== undefined && lng !== undefined && lat !== null && lng !== null;

      if (hasLatLng && a.locationLat != null && b.locationLat != null) {
        return (
          haversineKm(lat as number, lng as number, a.locationLat, a.locationLng!) -
          haversineKm(lat as number, lng as number, b.locationLat, b.locationLng!)
        );
      }
      return parseDistance(a.distanceText) - parseDistance(b.distanceText);
    }
    if (sort === "SOON") {
      return toTimeMs(a.meetingTime) - toTimeMs(b.meetingTime);
    }

    return String(b.id).localeCompare(String(a.id));
  });
}

export const meetingApiLocal: MeetingApi = {
  async listHotMeetings({ limit = 6, withinMinutes = 180 } = {}) {
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
        place: m.locationText || "위치 정보 없음",
        capacityJoined: m.capacityJoined,
        capacityTotal: m.capacityTotal,
      }));
  },
  async listMeetings({ category = "ALL", sort = "LATEST" } = {}) {
    await delay();
    const list = category === "ALL" ? _DATA : _DATA.filter((m) => m.category === category);
    return sortList(list, sort);
  },
  async listMeetingsAround(lat, lng, { radiusKm = 3, category = "ALL", sort = "NEAR" } = {}) {
    await delay();
    let candidates = _DATA.filter((m) => m.locationLat && m.locationLng);
    if (category !== "ALL") candidates = candidates.filter((m) => m.category === category);

    const within = candidates
      .map((m) => ({
        m,
        dist: haversineKm(lat, lng, m.locationLat!, m.locationLng!),
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

  async createMeeting(data) {
    await delay(800);
    const newId = String(Date.now());
    const newPost: MeetingPost = {
      ...data,
      id: newId,
      status: "OPEN",
      capacityJoined: 1,
      distanceText: "0km",
      meetingTime: (data as any).meetingTimeIso || new Date().toISOString(),
      myState: { membershipStatus: "HOST", canJoin: false },
      host: HOST_USERS.me,
    };
    _DATA.unshift(newPost);
    return newPost;
  },

  async updateMeeting(id, data) {
    await delay(800);
    const idx = _DATA.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error("Meeting not found");

    _DATA[idx] = {
      ..._DATA[idx],
      ...data,
      meetingTime: (data as any).meetingTimeIso || _DATA[idx].meetingTime,
    };
    return { ..._DATA[idx] };
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
    if (target.capacityJoined >= target.capacityTotal) throw new Error("Full");

    const isApproval = target.joinMode === "APPROVAL";
    const newStatus = isApproval ? "PENDING" : "MEMBER";
    const newCount = isApproval ? target.capacityJoined : target.capacityJoined + 1;

    _DATA[idx] = {
      ...target,
      capacityJoined: newCount,
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
      capacityJoined: isMember ? Math.max(0, target.capacityJoined - 1) : target.capacityJoined,
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
    const target = list.find((p) => p.userId === userId);
    if (target) {
      target.status = "MEMBER";
      const mIdx = _DATA.findIndex((m) => m.id === meetingId);
      if (mIdx > -1) _DATA[mIdx].capacityJoined++;
    }
    return [...list];
  },

  async rejectParticipant(meetingId, userId) {
    await delay(500);
    ensureParticipants(meetingId);

    const list = _PARTICIPANTS[meetingId];
    const target = list.find((p) => p.userId === userId);
    if (target) target.status = "REJECTED";
    return [...list];
  },
  async submitMeetingRating(req: SubmitMeetingRatingReq): Promise<SubmitMeetingRatingRes> {
    await delay(500);

    const meetingId = String(req.meetingId);
    const stars = clamp(Number(req.stars ?? 0), 0, 5);

    const idx = _DATA.findIndex((m) => m.id === meetingId);
    if (idx < 0) throw new Error("Meeting not found");

    _MEETING_LAST_STARS[meetingId] = stars;

    const hostAny = (_DATA[idx] as any).host;
    const hostUserId =
      String(hostAny?.userId ?? hostAny?.id ?? hostAny?.memberId ?? "host");

    const hostTemperature = starsToTemp(stars);

    if (_DATA[idx] && (_DATA[idx] as any).host) {
      (_DATA[idx] as any).host = {
        ...(_DATA[idx] as any).host,
        temperature: hostTemperature,
      };
    }

    return {
      ok: true,
      hostUserId,
      hostTemperature,
    };
  },
};
export default meetingApiLocal;
