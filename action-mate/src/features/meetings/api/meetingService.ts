// features/meetings/api/meetingService.ts
import type { CategoryKey, MembershipStatus, MeetingPost } from "../model/meeting.types";
import { MOCK_MEETINGS_SEED } from "../mocks/meetingMockData";

/**
 * ✅ meetings 도메인 단일 서비스
 * - 홈/상세/참여/지도/핫(마감임박) 모두 여기로
 * - mock 원본은 meetingMockData.ts에서만 관리
 */

// ✅ 공통 타입 및 정렬 타입 정의
export type MeetingParams = {
  title: string;
  category: CategoryKey;
  meetingTimeText: string;
  meetingTimeIso?: string;
  locationText: string;
  locationLat?: number;
  locationLng?: number;
  capacityTotal: number;
  content: string;
  joinMode: "INSTANT" | "APPROVAL";
  conditions?: string;
  durationMinutes: number;
  items?: string;
};

export type HomeSort = "LATEST" | "NEAR" | "SOON";

export type AroundMeetingsOptions = {
  radiusKm?: number; // 기본 3km
  category?: CategoryKey | "ALL";
  sort?: HomeSort;
};

// ✅ 홈 핫 카드용 타입 (HomeScreen의 HOT_ITEMS 대체)
export type HotMeetingItem = {
  id: string; // hot item id
  meetingId: string;
  badge: string; // "35분 남음" 등
  title: string;
  place: string;
  capacityJoined: number;
  capacityTotal: number;
};

// ✅ 서비스 내부 mock 원본 (서비스가 유일한 쓰기 주체)
let _DATA: MeetingPost[] = [...MOCK_MEETINGS_SEED];

// --- Helper: 네트워크 지연 시뮬레이션 ---
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Helper: 거리 파싱 (홈 NEAR 정렬용: 0.6km -> 0.6, 300m -> 0.3) ---
function parseDistanceToKm(distanceText?: string) {
  if (!distanceText) return 999;
  const s = distanceText.trim().toLowerCase();
  if (s.endsWith("km")) {
    const n = parseFloat(s.replace("km", "").trim());
    return Number.isFinite(n) ? n : 999;
  }
  if (s.endsWith("m")) {
    const n = parseFloat(s.replace("m", "").trim());
    return Number.isFinite(n) ? n / 1000 : 999;
  }
  return 999;
}

// --- Helper: Haversine 거리(km) ---
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371; // km
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

function formatDistanceText(km: number) {
  if (!Number.isFinite(km)) return undefined;
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

/**
 * ✅ 안전한 ISO -> ms 변환 (undefined/Invalid Date 방어)
 */
function toTimeMs(iso?: string) {
  if (!iso) return Number.MAX_SAFE_INTEGER;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : Number.MAX_SAFE_INTEGER;
}

function sortMeetings(list: MeetingPost[], sort: HomeSort) {
  const copy = [...list];
  copy.sort((a, b) => {
    if (sort === "NEAR") {
      return parseDistanceToKm(a.distanceText) - parseDistanceToKm(b.distanceText);
    }
    if (sort === "SOON") {
      // ✅ toTimeMs로 타입/안정성 해결
      return toTimeMs(a.meetingTime) - toTimeMs(b.meetingTime);
    }
    // LATEST: id가 숫자 문자열이라는 가정 유지(실서비스는 createdAt 추천)
    return Number(b.id) - Number(a.id);
  });
  return copy;
}

// --- Helper: 핫 뱃지 계산 ---
function minutesUntil(iso?: string) {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  return Math.floor((t - Date.now()) / 60000);
}

function hotBadgeFromMinutes(min: number) {
  if (!Number.isFinite(min)) return "";
  if (min < 0) return "이미 시작";
  if (min < 60) return `${min}분 남음`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r === 0 ? `${h}시간 남음` : `${h}시간 ${r}분 남음`;
}

/**
 * ✅ 0. 홈 핫(마감 임박) 목록
 * - 기존 HomeScreen의 HOT_ITEMS 제거 가능
 * - 실제 서비스처럼: "곧 시작하는 OPEN 모임"을 자동 추출
 */
export async function listHotMeetings(options?: {
  limit?: number;
  withinMinutes?: number; // 기본 180분(3시간)
}): Promise<HotMeetingItem[]> {
  await delay();

  const limit = options?.limit ?? 6;
  const withinMinutes = options?.withinMinutes ?? 180;

  const candidates = _DATA
    .filter((m) => m.status === "OPEN")
    .map((m) => ({ m, min: minutesUntil(m.meetingTime) }))
    .filter(({ min }) => min >= 0 && min <= withinMinutes)
    .sort((a, b) => a.min - b.min)
    .slice(0, limit);

  return candidates.map(({ m, min }, idx) => ({
    id: `hot-${idx}-${m.id}`,
    meetingId: m.id,
    badge: hotBadgeFromMinutes(min),
    title: m.title,
    place: m.locationText,
    capacityJoined: m.capacityJoined,
    capacityTotal: m.capacityTotal,
  }));
}

/**
 * ✅ 1. 홈 목록 조회 (필터 + 정렬)
 */
export async function listMeetings(params?: {
  category?: CategoryKey | "ALL";
  sort?: HomeSort;
}): Promise<MeetingPost[]> {
  await delay();

  const category = params?.category ?? "ALL";
  const sort = params?.sort ?? "LATEST";

  let filtered = [..._DATA];
  if (category !== "ALL") {
    filtered = filtered.filter((m) => m.category === category);
  }

  return sortMeetings(filtered, sort).map((m) => ({ ...m }));
}

/**
 * ✅ 1-2. 지도/근처 조회 (mapService 통합)
 * - distanceText를 “현재 위치 기준”으로 계산해서 반환(원본 _DATA는 불변)
 */
export async function listMeetingsAround(
  lat: number,
  lng: number,
  options?: AroundMeetingsOptions
): Promise<MeetingPost[]> {
  await delay();

  const radiusKm = options?.radiusKm ?? 3;
  const category = options?.category ?? "ALL";
  const sort = options?.sort ?? "NEAR";

  let candidates = _DATA.filter(
    (m) => typeof m.locationLat === "number" && typeof m.locationLng === "number"
  );

  if (category !== "ALL") {
    candidates = candidates.filter((m) => m.category === category);
  }

  const within = candidates
    .map((m) => {
      const dKm = haversineKm(lat, lng, m.locationLat!, m.locationLng!);
      return { m, dKm };
    })
    .filter(({ dKm }) => dKm <= radiusKm);

  within.sort((a, b) => {
    if (sort === "NEAR") return a.dKm - b.dKm;

    if (sort === "SOON") {
      // ✅ toTimeMs 적용 + ✅ timeB 오타 수정(b.m)
      return toTimeMs(a.m.meetingTime) - toTimeMs(b.m.meetingTime);
    }

    return Number(b.m.id) - Number(a.m.id);
  });

  return within.map(({ m, dKm }) => ({
    ...m,
    distanceText: formatDistanceText(dKm) ?? m.distanceText,
  }));
}

/**
 * ✅ 2. 상세 조회
 */
export async function getMeeting(id: string): Promise<MeetingPost> {
  await delay();
  const normalizedId = Array.isArray(id) ? id[0] : String(id ?? "");
  const found = _DATA.find((m) => String(m.id) === normalizedId);
  if (!found) throw new Error("Meeting not found");
  return { ...found };
}

/**
 * ✅ 3. 참여 요청
 */
export async function joinMeeting(
  id: string
): Promise<{ post: MeetingPost; membershipStatus: MembershipStatus }> {
  await delay();
  const index = _DATA.findIndex((m) => m.id === id);
  if (index === -1) throw new Error("Not found");

  const target = _DATA[index];
  const newStatus: MembershipStatus = target.joinMode === "APPROVAL" ? "PENDING" : "MEMBER";

  // 정원 체크(서비스에서 한번 더)
  if (target.status === "FULL" || target.capacityJoined >= target.capacityTotal) {
    _DATA[index] = {
      ...target,
      status: "FULL",
      myState: { membershipStatus: "NONE", canJoin: false, reason: "정원마감" },
    };
    return { post: { ..._DATA[index] }, membershipStatus: "NONE" as MembershipStatus };
  }

  let newJoinedCount = target.capacityJoined;
  if (newStatus === "MEMBER") {
    newJoinedCount = Math.min(target.capacityJoined + 1, target.capacityTotal);
  }

  const nextStatus = newJoinedCount >= target.capacityTotal ? "FULL" : target.status;

  _DATA[index] = {
    ...target,
    capacityJoined: newJoinedCount,
    status: nextStatus,
    myState: {
      membershipStatus: newStatus,
      canJoin: false,
      reason: newStatus === "PENDING" ? "승인 대기중" : "참여 완료",
    },
  };

  return { post: { ..._DATA[index] }, membershipStatus: newStatus };
}

/**
 * ✅ 4. 참여/신청 취소
 */
export async function cancelJoin(id: string): Promise<{ post: MeetingPost }> {
  await delay();
  const index = _DATA.findIndex((m) => m.id === id);
  if (index === -1) throw new Error("Not found");

  const target = _DATA[index];
  const oldStatus = target.myState?.membershipStatus;

  let newJoinedCount = target.capacityJoined;
  if (oldStatus === "MEMBER") {
    newJoinedCount = Math.max(0, target.capacityJoined - 1);
  }

  _DATA[index] = {
    ...target,
    capacityJoined: newJoinedCount,
    status: "OPEN",
    myState: { membershipStatus: "NONE", canJoin: true },
  };

  return { post: { ..._DATA[index] } };
}

/**
 * ✅ 5. 본문 수정
 */
export async function updateContent(id: string, text: string): Promise<{ post: MeetingPost }> {
  await delay();
  const index = _DATA.findIndex((m) => m.id === id);
  if (index === -1) throw new Error("Not found");

  _DATA[index] = { ..._DATA[index], content: text };
  return { post: { ..._DATA[index] } };
}

/**
 * ✅ 6. 모임 취소 (삭제)
 */
export async function cancelMeeting(id: string): Promise<{ post: MeetingPost }> {
  await delay();
  const index = _DATA.findIndex((m) => m.id === id);
  if (index === -1) throw new Error("Not found");

  const deleted = _DATA[index];
  _DATA.splice(index, 1);

  return { post: { ...deleted, status: "CANCELED" } };
}

/**
 * ✅ 7. 모임 생성
 */
export async function createMeeting(data: MeetingParams): Promise<MeetingPost> {
  await delay(800);

  const newId = Date.now().toString();

  const newMeeting: MeetingPost = {
    id: newId,
    category: data.category,
    title: data.title,
    meetingTimeText: data.meetingTimeText,
    meetingTime: data.meetingTimeIso,
    distanceText: "0.1km",
    locationText: data.locationText,
    locationLat: data.locationLat,
    locationLng: data.locationLng,
    capacityJoined: 1,
    capacityTotal: data.capacityTotal,
    joinMode: data.joinMode,
    conditions: data.conditions,
    status: "OPEN",
    content: data.content,
    myState: { membershipStatus: "HOST", canJoin: false, reason: "호스트" },
    durationHours: Math.round((data.durationMinutes / 60) * 10) / 10,
    durationMinutes: data.durationMinutes,
    host: {
      id: "me",
      nickname: "나(호스트)",
      mannerTemp: 36.5,
      kudosCount: 0,
      intro: "방금 만든 모임입니다!",
    },
  };

  _DATA.unshift(newMeeting);
  return { ...newMeeting };
}

/**
 * ✅ 8. 모임 수정
 */
export async function updateMeeting(id: string, data: MeetingParams): Promise<MeetingPost> {
  await delay(800);
  const index = _DATA.findIndex((m) => m.id === id);
  if (index === -1) throw new Error("Not found");

  const original = _DATA[index];
  const updated: MeetingPost = {
    ...original,
    ...data,
    meetingTime: data.meetingTimeIso ?? original.meetingTime,
    content: data.content,
    durationHours: Math.round((data.durationMinutes / 60) * 10) / 10,
    durationMinutes: data.durationMinutes,
  };

  _DATA[index] = updated;
  return { ...updated };
}

/**
 * (옵션) 디버그/테스트용
 */
export function __getMockDataUnsafe() {
  return _DATA;
}
