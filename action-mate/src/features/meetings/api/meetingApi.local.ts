import { MeetingApi } from "./meetingApi";
import { MOCK_MEETINGS_SEED } from "../mocks/meetingMockData";
import { MeetingPost, MeetingParams, HomeSort } from "../model/types";

// ✅ Local State (메모리상 데이터 유지)
let _DATA: MeetingPost[] = JSON.parse(JSON.stringify(MOCK_MEETINGS_SEED));

// --- Helpers (Internal) ---
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));
const toTimeMs = (iso?: string) => iso ? new Date(iso).getTime() : Number.MAX_SAFE_INTEGER;

// 거리 계산 (Haversine)
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; 
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// 텍스트 거리 파싱
function parseDistance(text?: string) {
  if (!text) return 999;
  const val = parseFloat(text.replace(/[^0-9.]/g, ""));
  return text.includes("m") && !text.includes("km") ? val / 1000 : val;
}

// 정렬 로직
function sortList(list: MeetingPost[], sort: HomeSort, lat?: number, lng?: number) {
  return [...list].sort((a, b) => {
    if (sort === "NEAR") {
        if(lat && lng && a.locationLat && b.locationLat) {
             return haversineKm(lat, lng, a.locationLat, a.locationLng!) - haversineKm(lat, lng, b.locationLat!, b.locationLng!);
        }
        return parseDistance(a.distanceText) - parseDistance(b.distanceText);
    }
    if (sort === "SOON") return toTimeMs(a.meetingTime) - toTimeMs(b.meetingTime);
    return Number(b.id) - Number(a.id); // LATEST
  });
}

// ✅ Mock Implementation
export const meetingApiLocal: MeetingApi = {
  
  async listHotMeetings({ limit = 6, withinMinutes = 180 } = {}) {
    await delay();
    const now = Date.now();
    return _DATA
      .filter(m => m.status === "OPEN")
      .map(m => ({ m, min: (toTimeMs(m.meetingTime) - now) / 60000 }))
      .filter(({ min }) => min >= 0 && min <= withinMinutes)
      .sort((a, b) => a.min - b.min)
      .slice(0, limit)
      .map(({ m, min }, idx) => ({
        id: `hot-${idx}`,
        meetingId: m.id,
        badge: min < 60 ? `${Math.floor(min)}분 남음` : `${Math.floor(min/60)}시간 남음`,
        title: m.title,
        place: m.locationText,
        capacityJoined: m.capacityJoined,
        capacityTotal: m.capacityTotal
      }));
  },

  async listMeetings({ category = "ALL", sort = "LATEST" } = {}) {
    await delay();
    let list = category === "ALL" ? _DATA : _DATA.filter(m => m.category === category);
    return sortList(list, sort);
  },

  async listMeetingsAround(lat, lng, { radiusKm = 3, category = "ALL", sort = "NEAR" } = {}) {
    await delay();
    let candidates = _DATA.filter(m => m.locationLat && m.locationLng);
    if (category !== "ALL") candidates = candidates.filter(m => m.category === category);

    const within = candidates.map(m => ({
      m, dist: haversineKm(lat, lng, m.locationLat!, m.locationLng!)
    })).filter(({ dist }) => dist <= radiusKm);

    // 거리순 정렬 후 포맷팅
    const sorted = within.sort((a, b) => sort === "NEAR" ? a.dist - b.dist : 0); // NEAR 외 정렬은 생략(단순화)
    
    return sorted.map(({ m, dist }) => ({
      ...m,
      distanceText: dist < 1 ? `${Math.round(dist*1000)}m` : `${dist.toFixed(1)}km`
    }));
  },

  async getMeeting(id) {
    await delay();
    const found = _DATA.find(m => m.id === id);
    if (!found) throw new Error("Not found");
    return { ...found };
  },

  async createMeeting(data) {
    await delay(800);
    const newId = Date.now().toString();
    const newPost: MeetingPost = {
      ...data,
      id: newId,
      status: "OPEN",
      capacityJoined: 1,
      distanceText: "0km",
      meetingTime: data.meetingTimeIso,
      myState: { membershipStatus: "HOST", canJoin: false },
      host: { id: "me", nickname: "나", mannerTemp: 36.5, kudosCount: 0 }
    };
    _DATA.unshift(newPost);
    return newPost;
  },

  async updateMeeting(id, data) {
    await delay(800);
    const idx = _DATA.findIndex(m => m.id === id);
    if (idx === -1) throw new Error("Not found");
    _DATA[idx] = { ..._DATA[idx], ...data, meetingTime: data.meetingTimeIso ?? _DATA[idx].meetingTime };
    return { ..._DATA[idx] };
  },

  async joinMeeting(id) {
    await delay();
    const idx = _DATA.findIndex(m => m.id === id);
    if (idx < 0) throw new Error("Not found");
    
    const target = _DATA[idx];
    const isApproval = target.joinMode === "APPROVAL";
    
    if (target.capacityJoined >= target.capacityTotal) throw new Error("Full");

    const newState = {
      ...target,
      capacityJoined: isApproval ? target.capacityJoined : target.capacityJoined + 1,
      myState: { 
        membershipStatus: isApproval ? "PENDING" : "MEMBER", 
        canJoin: false 
      } as any
    };
    _DATA[idx] = newState;
    return { post: newState, membershipStatus: newState.myState.membershipStatus };
  },

  async cancelJoin(id) {
    await delay();
    const idx = _DATA.findIndex(m => m.id === id);
    if (idx < 0) throw new Error("Not found");
    
    _DATA[idx].capacityJoined = Math.max(0, _DATA[idx].capacityJoined - 1);
    _DATA[idx].myState = { membershipStatus: "NONE", canJoin: true };
    return { post: { ..._DATA[idx] } };
  },

  async cancelMeeting(id) {
    await delay();
    const idx = _DATA.findIndex(m => m.id === id);
    if (idx < 0) throw new Error("Not found");
    _DATA.splice(idx, 1); // 실제 삭제
    return { post: { ..._DATA[idx], status: "CANCELED" } }; // 반환용 더미
  }
};
export function __getMockDataUnsafe() {
  return _DATA;
}