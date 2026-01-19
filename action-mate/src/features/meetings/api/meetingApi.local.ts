import { MeetingApi } from "./meetingApi"; // index.ts에서 인터페이스 import
import { MOCK_MEETINGS_SEED } from "../mocks/meetingMockData"; // 경로 확인 필요
import { MeetingPost, MeetingParams, HomeSort } from "../model/types";

// ✅ Local State (메모리상 데이터 유지)
// 앱을 새로고침하면 초기화되지만, 사용하는 동안은 변경사항이 유지됨
let _DATA: MeetingPost[] = JSON.parse(JSON.stringify(MOCK_MEETINGS_SEED));

// --- Helpers (Internal) ---
const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms)); // 0.5초 딜레이 (로딩 테스트용)
const toTimeMs = (iso?: string) => (iso ? new Date(iso).getTime() : Number.MAX_SAFE_INTEGER);

// 거리 계산 (Haversine Formula)
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // 지구 반지름 (km)
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

// 텍스트 거리 파싱 ("300m" -> 0.3, "1.5km" -> 1.5)
function parseDistance(text?: string) {
  if (!text) return 999;
  const val = parseFloat(text.replace(/[^0-9.]/g, ""));
  if (text.includes("m") && !text.includes("km")) return val / 1000;
  return val;
}

// 정렬 로직
function sortList(list: MeetingPost[], sort: HomeSort, lat?: number, lng?: number) {
  return [...list].sort((a, b) => {
    // 1. 거리순
    if (sort === "NEAR") {
      if (lat && lng && a.locationLat && b.locationLat && a.locationLng && b.locationLng) {
        return (
          haversineKm(lat, lng, a.locationLat, a.locationLng) -
          haversineKm(lat, lng, b.locationLat, b.locationLng)
        );
      }
      return parseDistance(a.distanceText) - parseDistance(b.distanceText);
    }
    // 2. 마감 임박순 (시간)
    if (sort === "SOON") {
      return toTimeMs(a.meetingTime) - toTimeMs(b.meetingTime);
    }
    // 3. 최신순 (기본) - ID가 타임스탬프 또는 숫자라고 가정
    return Number(b.id) - Number(a.id);
  });
}

// ✅ Mock Implementation
export const meetingApiLocal: MeetingApi = {
  // 핫딜 조회
  async listHotMeetings({ limit = 6, withinMinutes = 180 } = {}) {
    await delay();
    const now = Date.now();
    return _DATA
      .filter((m) => m.status === "OPEN")
      .map((m) => ({ m, min: (toTimeMs(m.meetingTime) - now) / 60000 }))
      .filter(({ min }) => min >= 0 && min <= withinMinutes) // 마감 전이고, N분 이내 남음
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

  // 목록 조회
  async listMeetings({ category = "ALL", sort = "LATEST" } = {}) {
    await delay();
    let list = category === "ALL" ? _DATA : _DATA.filter((m) => m.category === category);
    return sortList(list, sort);
  },

  // 지도/주변 조회
  async listMeetingsAround(lat, lng, { radiusKm = 3, category = "ALL", sort = "NEAR" } = {}) {
    await delay();
    let candidates = _DATA.filter((m) => m.locationLat && m.locationLng);
    
    if (category !== "ALL") {
      candidates = candidates.filter((m) => m.category === category);
    }

    // 반경 필터링
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

  // 상세 조회
  async getMeeting(id) {
    await delay();
    const found = _DATA.find((m) => m.id === id);
    if (!found) throw new Error("Meeting not found");
    return { ...found }; // Deep copy simulation
  },

  // 생성
  async createMeeting(data: MeetingParams) {
    await delay(800);
    const newId = Date.now().toString();
    
    // meetingTimeIso가 필수라고 가정 (없으면 현재시간)
    const timeIso = data.meetingTimeIso || new Date().toISOString();

    const newPost: MeetingPost = {
      ...data,
      id: newId,
      status: "OPEN",
      capacityJoined: 1, // 호스트 포함 1명
      distanceText: "0km", // 내 거니까
      meetingTime: timeIso, 
      
      // 서버에서 계산해준다고 가정
      durationHours: data.durationMinutes ? Math.floor(data.durationMinutes / 60) : 1, 
      
      myState: { membershipStatus: "HOST", canJoin: false },
      host: { 
        id: "me", 
        nickname: "나(Host)", 
        mannerTemp: 36.5, 
        kudosCount: 0, 
        intro: "안녕하세요!" 
      },
    };
    
    _DATA.unshift(newPost); // 최신순을 위해 앞에 추가
    return newPost;
  },

  // 수정
  async updateMeeting(id, data) {
    await delay(800);
    const idx = _DATA.findIndex((m) => m.id === id);
    if (idx === -1) throw new Error("Meeting not found");

    // 기존 데이터에 덮어쓰기
    _DATA[idx] = {
      ..._DATA[idx],
      ...data,
      meetingTime: data.meetingTimeIso ?? _DATA[idx].meetingTime,
    };
    return { ..._DATA[idx] };
  },

  // 참여 요청
  async joinMeeting(id) {
    await delay();
    const idx = _DATA.findIndex((m) => m.id === id);
    if (idx < 0) throw new Error("Meeting not found");

    const target = _DATA[idx];
    
    // 이미 꽉 찼는지 확인
    if (target.capacityJoined >= target.capacityTotal) {
      throw new Error("Meeting is full");
    }

    const isApproval = target.joinMode === "APPROVAL";

    // 승인제면 인원수 증가 안 함 (PENDING), 선착순이면 바로 증가 (MEMBER)
    const newJoinedCount = isApproval ? target.capacityJoined : target.capacityJoined + 1;
    const newStatus = isApproval ? "PENDING" : "MEMBER";

    const newState: MeetingPost = {
      ...target,
      capacityJoined: newJoinedCount,
      myState: {
        membershipStatus: newStatus,
        canJoin: false,
      },
    };

    _DATA[idx] = newState;
    return { post: newState, membershipStatus: newStatus };
  },

  // 참여 취소 / 요청 취소 / 나가기
  async cancelJoin(id) {
    await delay();
    const idx = _DATA.findIndex((m) => m.id === id);
    if (idx < 0) throw new Error("Meeting not found");

    const target = _DATA[idx];
    const currentStatus = target.myState?.membershipStatus;

    // ⚠️ 중요: MEMBER(참여확정)였던 경우에만 인원수 감소
    // PENDING(승인대기) 상태에서 취소하면 인원수는 그대로여야 함
    let newCount = target.capacityJoined;
    if (currentStatus === "MEMBER") {
      newCount = Math.max(0, target.capacityJoined - 1);
    }

    const newState: MeetingPost = {
      ...target,
      capacityJoined: newCount,
      myState: {
        membershipStatus: "NONE",
        canJoin: true, // 다시 참여 가능하게
      },
    };

    _DATA[idx] = newState;
    return { post: newState };
  },

  // 모임 삭제 (호스트)
  async cancelMeeting(id) {
    await delay();
    const idx = _DATA.findIndex((m) => m.id === id);
    if (idx < 0) throw new Error("Meeting not found");

    // 실제 데이터에서 삭제
    const deletedItem = _DATA[idx];
    _DATA.splice(idx, 1);

    return { post: { ...deletedItem, status: "CANCELED" } };
  },
};

// 디버깅용: 현재 메모리 데이터 확인
export function __getMockDataUnsafe() {
  return _DATA;
}