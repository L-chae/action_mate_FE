// src/features/meetings/api/meetingApi.local.ts

import { MOCK_MEETINGS_SEED } from "../mocks/meetingMockData";
import { 
  MeetingPost, 
  MeetingParams, 
  HomeSort, 
  MeetingApi, 
  Participant
} from "../model/types";

// ✅ Local State
let _DATA: MeetingPost[] = JSON.parse(JSON.stringify(MOCK_MEETINGS_SEED));

// ✅ [신규] 참여자 데이터 Mock
const _PARTICIPANTS: Record<string, Participant[]> = {};

// --- Helpers (Internal) ---
const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));
const toTimeMs = (iso?: string) => (iso ? new Date(iso).getTime() : Number.MAX_SAFE_INTEGER);

// ✅ 헬퍼: 참여자 더미 데이터 생성 (최초 조회 시)
const ensureParticipants = (meetingId: string) => {
  if (!_PARTICIPANTS[meetingId]) {
    _PARTICIPANTS[meetingId] = [
      { 
        userId: "u_test_1", 
        nickname: "테니스왕", 
        // ✅ [수정] avatarUrl -> avatar
        avatar: undefined, 
        status: "PENDING", 
        appliedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString() 
      },
      { 
        userId: "u_test_2", 
        nickname: "초보에요", 
        // ✅ [수정] avatarUrl -> avatar
        avatar: undefined, 
        status: "MEMBER", 
        appliedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString() 
      },
    ];
  }
};

// 거리 계산
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

// 텍스트 거리 파싱
function parseDistance(text?: string) {
  if (!text) return 999;
  const val = parseFloat(text.replace(/[^0-9.]/g, ""));
  if (text.includes("m") && !text.includes("km")) return val / 1000;
  return val;
}

// 정렬 로직
function sortList(list: MeetingPost[], sort: HomeSort, lat?: number, lng?: number) {
  return [...list].sort((a, b) => {
    if (sort === "NEAR") {
      if (lat && lng && a.locationLat && b.locationLat && a.locationLng && b.locationLng) {
        return (
          haversineKm(lat, lng, a.locationLat, a.locationLng) -
          haversineKm(lat, lng, b.locationLat, b.locationLng)
        );
      }
      return parseDistance(a.distanceText) - parseDistance(b.distanceText);
    }
    if (sort === "SOON") {
      return toTimeMs(a.meetingTime) - toTimeMs(b.meetingTime);
    }
    return Number(b.id) - Number(a.id);
  });
}

// ✅ Mock Implementation
export const meetingApiLocal: MeetingApi = {
  // 1. 핫한 모임
  async listHotMeetings({ limit = 6, withinMinutes = 180 } = {}) {
    await delay();
    const now = Date.now();
    return _DATA
      .filter((m) => m.status === "OPEN")
      .map((m) => ({ m, min: (toTimeMs(m.meetingTime) - now) / 60000 }))
      .filter(({ min }) => min >= 0 && min <= withinMinutes)
      .sort((a, b) => a.min - b.min)
      .slice(0, limit)
      .map(({ m, min }, idx) => ({
        id: `hot-${idx}`,
        meetingId: m.id,
        badge: min < 60 ? `${Math.floor(min)}분 남음` : `${Math.floor(min / 60)}시간 남음`,
        title: m.title,
        place: m.locationText,
        capacityJoined: m.capacityJoined,
        capacityTotal: m.capacityTotal,
      }));
  },

  // 2. 모임 목록
  async listMeetings({ category = "ALL", sort = "LATEST" } = {}) {
    await delay();
    let list = category === "ALL" ? _DATA : _DATA.filter((m) => m.category === category);
    return sortList(list, sort);
  },

  // 3. 주변 모임
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

  // 4. 모임 상세
  async getMeeting(id) {
    await delay();
    const found = _DATA.find((m) => m.id === id);
    if (!found) throw new Error("Meeting not found");
    return { ...found };
  },

  // 5. 모임 생성
  async createMeeting(data) {
    await delay(800);
    const newId = Date.now().toString();
    const timeIso = data.meetingTimeIso || new Date().toISOString();

    const newPost: MeetingPost = {
      ...data,
      id: newId,
      status: "OPEN",
      capacityJoined: 1,
      distanceText: "0km",
      meetingTime: timeIso,
      myState: { membershipStatus: "HOST", canJoin: false },
      host: { id: "me", nickname: "나(Host)", mannerTemp: 36.5, kudosCount: 0, intro: "안녕하세요!" },
    };

    _DATA.unshift(newPost);
    return newPost;
  },

  // 6. 모임 수정
  async updateMeeting(id, data) {
    await delay(800);
    const idx = _DATA.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error("Meeting not found");

    const prev = _DATA[idx];

    _DATA[idx] = {
      ...prev,
      ...data,
      meetingTime: data.meetingTimeIso ?? prev.meetingTime,
      durationMinutes: data.durationMinutes ?? prev.durationMinutes, 
    };

    return { ..._DATA[idx] };
  },

  // 7. 참여하기
  async joinMeeting(id) {
    await delay();
    const idx = _DATA.findIndex((m) => m.id === id);
    if (idx < 0) throw new Error("Meeting not found");

    const target = _DATA[idx];
    if (target.capacityJoined >= target.capacityTotal) {
      throw new Error("Meeting is full");
    }

    const isApproval = target.joinMode === "APPROVAL";
    // 승인제면 PENDING(인원증가X), 선착순이면 MEMBER(인원증가O)
    const newJoinedCount = isApproval ? target.capacityJoined : target.capacityJoined + 1;
    const newStatus = isApproval ? "PENDING" : "MEMBER";

    const newState: MeetingPost = {
      ...target,
      capacityJoined: newJoinedCount,
      myState: { membershipStatus: newStatus, canJoin: false },
    };

    _DATA[idx] = newState;
    return { post: newState, membershipStatus: newStatus };
  },

  // 8. 참여 취소
  async cancelJoin(id) {
    await delay();
    const idx = _DATA.findIndex((m) => m.id === id);
    if (idx < 0) throw new Error("Meeting not found");

    const target = _DATA[idx];
    const currentStatus = target.myState?.membershipStatus;

    // MEMBER(확정) 상태였던 경우에만 인원수 감소
    let newCount = target.capacityJoined;
    if (currentStatus === "MEMBER") {
      newCount = Math.max(0, target.capacityJoined - 1);
    }

    const newState: MeetingPost = {
      ...target,
      capacityJoined: newCount,
      myState: { membershipStatus: "NONE", canJoin: true },
    };

    _DATA[idx] = newState;
    return { post: newState };
  },

  // 9. 모임 취소/삭제
  async cancelMeeting(id) {
    await delay();
    const idx = _DATA.findIndex((m) => m.id === id);
    if (idx < 0) throw new Error("Meeting not found");
    const deletedItem = _DATA[idx];
    _DATA.splice(idx, 1);
    return { post: { ...deletedItem, status: "CANCELED" } };
  },

  // ✅ [신규] 참여자 목록 조회
  async getParticipants(meetingId) {
    await delay(300);
    ensureParticipants(meetingId);
    return [..._PARTICIPANTS[meetingId]];
  },

  // ✅ [신규] 참여 승인
  async approveParticipant(meetingId, userId) {
    await delay(500);
    ensureParticipants(meetingId);
    
    // 1. 상태 변경 (PENDING -> MEMBER)
    const pIdx = _PARTICIPANTS[meetingId].findIndex(p => p.userId === userId);
    if (pIdx > -1) {
      _PARTICIPANTS[meetingId][pIdx].status = "MEMBER";
    }

    // 2. 모임 인원수 증가 (+1)
    const mIdx = _DATA.findIndex(m => m.id === meetingId);
    if (mIdx > -1) {
      _DATA[mIdx].capacityJoined += 1;
    }

    return [..._PARTICIPANTS[meetingId]];
  },

  // ✅ [신규] 참여 거절
  async rejectParticipant(meetingId, userId) {
    await delay(500);
    ensureParticipants(meetingId);

    // 1. 상태 변경 (PENDING -> REJECTED)
    const pIdx = _PARTICIPANTS[meetingId].findIndex(p => p.userId === userId);
    if (pIdx > -1) {
      _PARTICIPANTS[meetingId][pIdx].status = "REJECTED";
    }
    
    return [..._PARTICIPANTS[meetingId]];
  },
};

export function __getMockDataUnsafe() {
  return _DATA;
}