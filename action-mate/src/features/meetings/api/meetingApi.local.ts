import { MOCK_MEETINGS_SEED, HOST_USERS } from "../mocks/meetingMockData";
import type { HomeSort, MeetingApi, MeetingPost, Participant } from "../model/types";

// ✅ Local State Deep Copy
let _DATA: MeetingPost[] = JSON.parse(JSON.stringify(MOCK_MEETINGS_SEED));

// ✅ 참여자 더미 데이터 저장소
const _PARTICIPANTS: Record<string, Participant[]> = {};

// ✅ 평가 기록 저장소 (Mock)
const _MEETING_LAST_STARS: Record<string, number> = {};

// --- Helpers ---
const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));
const toTimeMs = (iso?: string) => (iso ? new Date(iso).getTime() : Number.MAX_SAFE_INTEGER);
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

// 별점 -> 온도 변환 로직 (Mock용 단순 계산)
const starsToTemp = (stars: number) => {
  return 36.5 + (stars - 3) * 2; // 3점=36.5도, 5점=40.5도
};

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
      if (lat && lng && a.location.lat && b.location.lat) {
        return (
          haversineKm(lat, lng, a.location.lat, a.location.lng) -
          haversineKm(lat, lng, b.location.lat, b.location.lng)
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

// ✅ Mock Implementation
export const meetingApiLocal: MeetingApi = {
  // 1. Hot Items
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
        place: m.location.name,
        capacityJoined: m.capacity.current,
        capacityTotal: m.capacity.total,
      }));
  },

  // 2. List
  async listMeetings({ category = "ALL", sort = "LATEST" } = {}) {
    await delay();
    const list = category === "ALL" ? _DATA : _DATA.filter((m) => m.category === category);
    return sortList(list, sort);
  },

  // 3. Around
  async listMeetingsAround(lat, lng, { radiusKm = 3, category = "ALL", sort = "NEAR" } = {}) {
    await delay();
    let candidates = _DATA.filter((m) => m.location.lat && m.location.lng);
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

  async createMeeting(data) {
    await delay(800);
    const newId = String(Date.now());
    
    const newPost: MeetingPost = {
      id: newId,
      category: data.category,
      title: data.title,
      content: data.content,
      meetingTime: data.meetingTimeIso,
      
      location: {
        name: data.locationText,
        lat: data.locationLat || 0,
        lng: data.locationLng || 0,
      },
      
      capacity: {
        total: data.capacityTotal,
        current: 1,
      },
      
      status: "OPEN",
      joinMode: data.joinMode,
      distanceText: "0km",
      
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

    const prev = _DATA[idx];
    _DATA[idx] = {
      ...prev,
      ...data,
      meetingTime: data.meetingTimeIso || prev.meetingTime,
      location: {
        name: data.locationText || prev.location.name,
        lat: data.locationLat ?? prev.location.lat,
        lng: data.locationLng ?? prev.location.lng,
      },
      capacity: prev.capacity
    } as MeetingPost;
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
        current: isMember ? Math.max(0, target.capacity.current - 1) : target.capacity.current
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
      if (mIdx > -1) _DATA[mIdx].capacity.current++;
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

  // ✅ [수정 완료] 객체 내부에 위치시킴 + 타입 any 우회 (interface에 없을 경우 대비)
  async submitMeetingRating(req: { meetingId: string; stars: number }): Promise<any> {
    await delay(500);

    const meetingId = String(req.meetingId);
    const stars = clamp(Number(req.stars ?? 0), 0, 5);

    const idx = _DATA.findIndex((m) => m.id === meetingId);
    if (idx < 0) throw new Error("Meeting not found");

    _MEETING_LAST_STARS[meetingId] = stars;

    // 호스트 매너온도 업데이트 시늉
    const hostTemperature = starsToTemp(stars);

    if (_DATA[idx] && (_DATA[idx] as any).host) {
      (_DATA[idx] as any).host = {
        ...(_DATA[idx] as any).host,
        mannerTemperature: hostTemperature, // mannerTemperature로 필드명 통일
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