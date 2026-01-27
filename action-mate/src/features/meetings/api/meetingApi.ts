// ============================================================================
// src/features/meetings/api/meetingApi.ts
// ============================================================================
import { client } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/api/endpoints";
import { nowIso } from "@/shared/utils/timeText";

import type { UserSummary } from "@/shared/model/types";
import type {
  CategoryKey,
  Comment,
  HostSummary,
  HomeSort,
  JoinMode,
  MeetingApi,
  MeetingPost,
  MeetingUpsert,
  MembershipStatus,
  Participant,
  PostStatus,
  HotMeetingItem,
} from "../model/types";

import type { MeetingPostDTO, ApplicantDTO } from "../model/dto";
import {
  toMeetingPost,
  toParticipant,
  toPostCategory,
  toPostCreateRequest,
  toPostUpdateRequest,
} from "../model/mappers";

// -----------------------------------------------------------------------------
// Mock Data (mocks/meetingMockData.ts 통합 + 일부 축소)
// -----------------------------------------------------------------------------
const makeUser = (u: { id: string; nickname: string; avatarUrl?: string | null }): UserSummary =>
  ({
    id: u.id,
    nickname: u.nickname,
    avatarUrl: u.avatarUrl ?? undefined,
  } as unknown as UserSummary);

export const MEETING_COMMENTS_MOCK: Comment[] = [
  {
    id: "cmt_001",
    content: "집결은 몇 분 전까지 가면 될까요?",
    createdAt: "2026-01-24T18:52:00+09:00",
    author: makeUser({ id: "user_101", nickname: "서연", avatarUrl: "https://picsum.photos/seed/user_101/128/128" }),
  },
  {
    id: "cmt_002",
    parentId: "cmt_001",
    content: "시작 10분 전까지 오시면 좋아요. 늦으면 채팅으로 위치 공유드릴게요!",
    createdAt: "2026-01-24T18:56:40+09:00",
    author: makeUser({
      id: "user_host",
      nickname: "호스트민지",
      avatarUrl: "https://picsum.photos/seed/user_host/128/128",
    }),
  },
  {
    id: "cmt_003",
    content: "준비물 따로 있을까요? 운동화만 챙기면 되나요?",
    createdAt: "2026-01-24T19:10:10+09:00",
    author: makeUser({ id: "user_202", nickname: "준호", avatarUrl: "https://picsum.photos/seed/user_202/128/128" }),
  },
  {
    id: "cmt_004",
    parentId: "cmt_003",
    content: "운동화/편한 복장만 있으면 충분해요. 필요한 건 제가 여유분 조금 챙겨갈게요.",
    createdAt: "2026-01-24T19:12:50+09:00",
    author: makeUser({
      id: "user_host",
      nickname: "호스트민지",
      avatarUrl: "https://picsum.photos/seed/user_host/128/128",
    }),
  },
];

export const HOST_USERS: Record<string, HostSummary> = {
  user1: {
    id: "u1",
    nickname: "민수",
    avgRate: 3.5,
    orgTime: 12,
    intro: "운동 좋아해요. 초보도 환영!",
    avatarUrl: "https://i.pravatar.cc/150?u=u1",
  },
  user2: {
    id: "u2",
    nickname: "보드게임마스터",
    avgRate: 5.0,
    orgTime: 56,
    intro: "룰 설명 가능 / 초보 환영!",
    avatarUrl: "https://i.pravatar.cc/150?u=u2",
  },
  user3: {
    id: "u3",
    nickname: "새벽러너",
    avgRate: 2.25,
    orgTime: 3,
    intro: "가볍게 달려요.",
    avatarUrl: null,
  },
  me: {
    id: "me",
    nickname: "나(호스트)",
    avgRate: 2.4,
    orgTime: 0,
    intro: "내가 만든 모임이에요.",
    avatarUrl: "https://i.pravatar.cc/150?u=me",
  },
};

const __now = Date.now();
const h = (hoursFromNow: number) => new Date(__now + hoursFromNow * 3600_000).toISOString();
const d = (daysFromNow: number, hour = 12, minute = 0) => {
  const base = new Date(__now);
  base.setDate(base.getDate() + daysFromNow);
  base.setHours(hour, minute, 0, 0);
  return base.toISOString();
};

/**
 * ✅ 축소된 seed(8개)
 * - 상태/승인/내상태 분산은 유지(OPEN/FULL/STARTED/CANCELED/ENDED + INSTANT/APPROVAL + NONE/MEMBER/PENDING/HOST)
 * - 강남권 중심 + 동탄 1개만 유지
 */
export const MOCK_MEETINGS_SEED: MeetingPost[] = [
  {
    id: "101",
    category: "SPORTS",
    title: "강남역 배드민턴 더블 2게임",
    content: "초보 환영! 워밍업 후 더블로 2게임. 라켓은 개인 지참 권장.",
    meetingTime: h(2),
    location: { name: "강남역 11번 출구 집결", latitude: 37.4986, longitude: 127.0279 } as any,
    address: "서울 서초구 강남대로 396 (강남역 인근)",
    distanceText: "0.4km",
    capacity: { current: 2, max: 4, total: 4 } as any,
    joinMode: "INSTANT",
    status: "OPEN",
    myState: { membershipStatus: "NONE", canJoin: true } as any,
    durationMinutes: 110,
    host: HOST_USERS.user1,
  },
  {
    id: "103",
    category: "SPORTS",
    title: "역삼 탁구 랠리 1시간",
    content: "랠리 위주로 진행. 라켓 1개 여유 있어요. 매너 플레이 부탁!",
    meetingTime: h(3.5),
    location: { name: "역삼역 1번 출구 근처", latitude: 37.5006, longitude: 127.0364 } as any,
    address: "서울 강남구 테헤란로 142 (역삼역 인근)",
    distanceText: "0.9km",
    capacity: { current: 4, max: 4, total: 4 } as any,
    joinMode: "INSTANT",
    status: "FULL",
    myState: { membershipStatus: "MEMBER", canJoin: false, reason: "참여중" } as any,
    durationMinutes: 60,
    host: HOST_USERS.user1,
  },
  {
    id: "104",
    category: "SPORTS",
    title: "선릉 농구 3:3 한 판",
    content: "하프코트 3:3로 60~90분. 거친 몸싸움은 지양합니다.",
    conditions: "경력 1년 이상",
    meetingTime: h(-0.6),
    location: { name: "선릉역 인근 체육시설", latitude: 37.5045, longitude: 127.0488 } as any,
    address: "서울 강남구 선릉로 일대 (선릉역 인근)",
    distanceText: "1.7km",
    capacity: { current: 6, max: 6, total: 6 } as any,
    joinMode: "INSTANT",
    status: "STARTED",
    myState: { membershipStatus: "NONE", canJoin: false, reason: "이미 시작됨" } as any,
    durationMinutes: 90,
    host: HOST_USERS.user1,
  },
  {
    id: "105",
    category: "SPORTS",
    title: "삼성 실내 수영 1시간",
    content: "자유수영 1시간 + 정리 10분. 수영모/수경 필수.",
    meetingTime: d(1, 7, 40),
    location: { name: "삼성역 인근 스포츠센터", latitude: 37.5089, longitude: 127.0631 } as any,
    address: "서울 강남구 봉은사로 일대 (삼성역 인근)",
    distanceText: "2.3km",
    capacity: { current: 1, max: 6, total: 6 } as any,
    joinMode: "APPROVAL",
    status: "CANCELED",
    myState: { membershipStatus: "NONE", canJoin: false, reason: "취소됨" } as any,
    durationMinutes: 60,
    host: HOST_USERS.user3,
  },
  {
    id: "201",
    category: "MEAL",
    title: "강남역 점심 김치찌개",
    content: "점심에 빠르게 먹고 해산(45분). 1/N, 노쇼는 미리 연락!",
    meetingTime: h(1.2),
    location: { name: "강남역 10번 출구", latitude: 37.498, longitude: 127.0276 } as any,
    address: "서울 서초구 강남대로 405 (강남역 인근)",
    distanceText: "0.3km",
    capacity: { current: 1, max: 4, total: 4 } as any,
    joinMode: "INSTANT",
    status: "OPEN",
    myState: { membershipStatus: "HOST", canJoin: false, reason: "호스트" } as any,
    durationMinutes: 45,
    host: HOST_USERS.me,
  },
  {
    id: "301",
    category: "STUDY",
    title: "강남역 모각코 2시간",
    content: "각자 작업(대화 최소) + 마지막 10분만 공유. 노트북/이어폰 권장.",
    conditions: "대화 최소",
    meetingTime: d(1, 19, 30),
    location: { name: "강남역 스터디카페", latitude: 37.4978, longitude: 127.0275 } as any,
    address: "서울 서초구 서초대로 77길 일대 (강남역 인근)",
    distanceText: "0.8km",
    capacity: { current: 2, max: 6, total: 6 } as any,
    joinMode: "APPROVAL",
    status: "OPEN",
    myState: { membershipStatus: "PENDING", canJoin: false, reason: "승인 대기중" } as any,
    durationMinutes: 120,
    host: HOST_USERS.user3,
  },
  {
    id: "401",
    category: "GAMES",
    title: "강남 보드게임 한 판",
    content: "파티게임/가벼운 전략 섞어서 진행. 초보 환영(룰 설명 가능).",
    meetingTime: d(1, 16, 0),
    location: { name: "강남역 보드게임 카페", latitude: 37.4974, longitude: 127.0292 } as any,
    address: "서울 서초구 강남대로 420 (강남역 인근)",
    distanceText: "0.9km",
    capacity: { current: 2, max: 6, total: 6 } as any,
    joinMode: "APPROVAL",
    status: "OPEN",
    myState: { membershipStatus: "NONE", canJoin: true } as any,
    durationMinutes: 180,
    host: HOST_USERS.user2,
  },
  {
    id: "531",
    category: "GAMES",
    title: "동탄 보드게임 모임",
    content: "파티게임 위주로 가볍게 진행했습니다. 다음에는 전략도 섞어볼게요.",
    meetingTime: d(-4, 19, 0),
    location: { name: "동탄 보드게임 카페", latitude: 37.2042, longitude: 127.0697 } as any,
    address: "경기 화성시 동탄중심상가 일대",
    distanceText: "1.1km",
    capacity: { current: 6, max: 6, total: 6 } as any,
    joinMode: "APPROVAL",
    status: "ENDED",
    myState: { membershipStatus: "MEMBER", canJoin: false } as any,
    durationMinutes: 180,
    host: HOST_USERS.user2,
  },
];

// -----------------------------------------------------------------------------
// Mode (mock/remote)
// -----------------------------------------------------------------------------
function parseEnvBool(v: unknown): boolean | undefined {
  if (v == null) return undefined;
  const s = String(v).trim().toLowerCase();
  if (!s) return undefined;
  if (s === "true" || s === "1" || s === "yes" || s === "y" || s === "on") return true;
  if (s === "false" || s === "0" || s === "no" || s === "n" || s === "off") return false;
  return undefined;
}

const ENV_USE_MOCK = parseEnvBool(process.env.EXPO_PUBLIC_USE_MOCK);
const USE_MOCK: boolean = __DEV__ ? (ENV_USE_MOCK ?? true) : false;

export const __MEETING_API_MODE__ = USE_MOCK ? "mock" : "remote";

// -----------------------------------------------------------------------------
// Local(Mock) Implementation
// -----------------------------------------------------------------------------
type MeetingApiWithUnsafe = MeetingApi & { __getMockDataUnsafe?: () => MeetingPost[] };

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

const toCategoryKey = (v: unknown): CategoryKey => (isOneOf(v, CATEGORY_KEYS) ? v : "ETC");
const toStatus = (v: unknown): PostStatus => (isOneOf(v, STATUS_KEYS) ? v : "OPEN");
const toJoinMode = (v: unknown): JoinMode => (isOneOf(v, JOIN_KEYS) ? v : "INSTANT");

const toNumberOrNull = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

const getLat = (loc: any): number | null => toNumberOrNull(loc?.latitude ?? loc?.lat ?? loc?.y ?? loc?.Lat ?? loc?.LAT);
const getLng = (loc: any): number | null =>
  toNumberOrNull(loc?.longitude ?? loc?.lng ?? loc?.x ?? loc?.Lng ?? loc?.LNG);

function ensureCapacity(raw: any): MeetingPost["capacity"] {
  const max = num(raw?.capacity?.max ?? raw?.capacity?.total ?? raw?.capacity?.max ?? raw?.capacity ?? raw?.max ?? 4, 4);
  const current = num(raw?.capacity?.current ?? raw?.currentCount ?? raw?.current ?? 0, 0);

  const safeMax = Math.max(1, Math.trunc(max));
  const safeCurrent = Math.max(0, Math.min(Math.trunc(current), safeMax));

  return { max: safeMax, current: safeCurrent, total: safeMax } as any;
}

function ensureLocation(raw: any): any {
  const base = raw?.location ?? raw;
  const name = str(base?.name ?? raw?.locationName ?? raw?.locationText ?? raw?.place ?? "", "").trim();

  const latitude = getLat(base);
  const longitude = getLng(base);

  const addressRaw = base?.address ?? raw?.address;
  const address = addressRaw == null ? null : typeof addressRaw === "string" ? addressRaw : null;

  return {
    name: name || "장소 미정",
    latitude,
    longitude,
    address,
  } as any;
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

      const hasA = Number.isFinite(aLat ?? NaN) && Number.isFinite(aLng ?? NaN);
      const hasB = Number.isFinite(bLat ?? NaN) && Number.isFinite(bLng ?? NaN);

      if (hasBase && hasA && hasB) {
        return (
          haversineKm(lat!, lng!, aLat as number, aLng as number) -
          haversineKm(lat!, lng!, bLat as number, bLng as number)
        );
      }
      return parseDistance((a as any)?.distanceText) - parseDistance((b as any)?.distanceText);
    }

    if (sort === "SOON") return toTimeMs((a as any)?.meetingTime) - toTimeMs((b as any)?.meetingTime);

    return String((b as any)?.id ?? "").localeCompare(String((a as any)?.id ?? ""));
  });
}

function calcCanJoin(post: MeetingPost): { canJoin: boolean; reason?: string } {
  const status = toStatus((post as any)?.status);
  if (status !== "OPEN") return { canJoin: false, reason: "모집 중이 아닙니다." };

  const max = num((post as any)?.capacity?.max ?? (post as any)?.capacity?.total, 0);
  const current = num((post as any)?.capacity?.current, 0);

  if (max > 0 && current >= max) return { canJoin: false, reason: "정원이 가득 찼습니다." };
  return { canJoin: true };
}

function normalizeHost(raw: any) {
  const fallback = HOST_USERS?.me ?? {
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
  const meetingTime = str(raw?.meetingTime, nowIso());
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

function clonePost(p: MeetingPost): MeetingPost {
  return {
    ...p,
    location: p.location ? ({ ...(p.location as any) } as any) : p.location,
    capacity: (p as any)?.capacity ? ({ ...((p as any).capacity as any) } as any) : (p as any)?.capacity,
    myState: (p as any)?.myState ? ({ ...((p as any).myState as any) } as any) : (p as any)?.myState,
    host: (p as any)?.host ? ({ ...((p as any).host as any) } as any) : (p as any)?.host,
  };
}

let _DATA: MeetingPost[] = (JSON.parse(JSON.stringify(MOCK_MEETINGS_SEED)) as any[]).map(normalizeSeedToPost);
const _PARTICIPANTS: Record<string, Participant[]> = {};
const _MEETING_LAST_STARS: Record<string, number> = {};

const ensureParticipants = (meetingId: string) => {
  if (_PARTICIPANTS[meetingId]) return;

  _PARTICIPANTS[meetingId] = [
    {
      id: "u_test_1",
      nickname: "테니스왕",
      avatarUrl: "https://i.pravatar.cc/150?u=test1",
      status: "PENDING",
      appliedAt: new Date(Date.now() - 3600_000).toISOString(),
    } as any,
    {
      id: "u_test_2",
      nickname: "초보에요",
      avatarUrl: null,
      status: "MEMBER",
      appliedAt: new Date(Date.now() - 7200_000).toISOString(),
    } as any,
  ];
};

function minutesUntil(iso?: string) {
  const t = toTimeMs(iso);
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  return (t - Date.now()) / 60000;
}

function remainingSeats(post: MeetingPost) {
  const max = num((post as any)?.capacity?.max ?? (post as any)?.capacity?.total, 0);
  const current = num((post as any)?.capacity?.current, 0);
  if (max <= 0) return 999;
  return Math.max(0, max - current);
}

function recomputeMyState(post: MeetingPost): MeetingPost["myState"] {
  const prev = (post as any)?.myState as any;
  const status = prev?.membershipStatus ?? "NONE";
  if (status !== "NONE") return prev;
  return { membershipStatus: "NONE", ...calcCanJoin(post) } as any;
}

export const meetingApiLocal: MeetingApiWithUnsafe = {
  __getMockDataUnsafe: () => _DATA,

  async listHotMeetings({ limit = 6, withinMinutes = 180 } = {}): Promise<HotMeetingItem[]> {
    await delay();

    const list = _DATA
      .filter((m) => (m as any)?.status === "OPEN")
      .filter((m) => remainingSeats(m) <= 2)
      .map((m) => ({ m, min: minutesUntil((m as any)?.meetingTime) }))
      .filter(({ min }) => (withinMinutes == null ? true : min >= 0 && min <= withinMinutes))
      .sort((a, b) => a.min - b.min)
      .slice(0, limit)
      .map(({ m, min }) => ({
        id: `hot-${(m as any)?.id}`,
        meetingId: (m as any)?.id,
        badge:
          Number.isFinite(min) && min >= 0
            ? min < 60
              ? `${Math.floor(min)}분 남음`
              : `${Math.floor(min / 60)}시간 남음`
            : "마감임박",
        title: (m as any)?.title ?? "",
        location: { ...((m as any)?.location ?? {}) },
        capacity: { ...((m as any)?.capacity ?? {}) },
      })) as HotMeetingItem[];

    return list;
  },

  async listMeetings({ category = "ALL", sort = "LATEST" } = {}) {
    await delay();
    const list = category === "ALL" ? _DATA : _DATA.filter((m) => String((m as any)?.category) === String(category));
    return sortList(list, sort).map(clonePost);
  },

  async listMeetingsAround(lat, lng, { radiusKm = 3, category = "ALL", sort = "NEAR" } = {}) {
    await delay();

    let candidates = _DATA;
    if (category !== "ALL") candidates = candidates.filter((m) => String((m as any)?.category) === String(category));

    const within = candidates
      .map((m) => {
        const mLat = getLat((m as any)?.location);
        const mLng = getLng((m as any)?.location);
        const valid = Number.isFinite(mLat ?? NaN) && Number.isFinite(mLng ?? NaN);
        const dist = valid ? haversineKm(lat, lng, mLat as number, mLng as number) : Number.POSITIVE_INFINITY;
        return { m, dist };
      })
      .filter(({ dist }) => dist <= radiusKm);

    const sorted = within.sort((a, b) => (sort === "NEAR" ? a.dist - b.dist : 0));

    return sorted.map(({ m, dist }) =>
      clonePost({
        ...(m as any),
        distanceText: dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`,
      } as any),
    );
  },

  async getMeeting(id) {
    await delay();
    const found = _DATA.find((m) => String((m as any)?.id) === String(id));
    if (!found) throw new Error("Meeting not found");
    return clonePost(found);
  },

  async createMeeting(data: MeetingUpsert) {
    await delay(800);

    const newId = String(Date.now());
    const maxRaw = (data as any)?.capacity?.max ?? (data as any)?.capacity?.total ?? 4;
    const max = Math.max(1, Math.trunc(num(maxRaw, 4)));
    const current = 1;

    const loc = ensureLocation({ location: (data as any)?.location });
    const host = normalizeHost(HOST_USERS.me);

    const newPost: MeetingPost = {
      id: newId,
      category: (data as any)?.category,
      title: ((data as any)?.title?.trim() ? (data as any)?.title : "(제목 없음)") as any,
      content: (data as any)?.content,
      meetingTime: (data as any)?.meetingTime,
      durationMinutes: (data as any)?.durationMinutes,
      location: { ...loc } as any,
      capacity: { max, current, total: max } as any,
      status: "OPEN",
      joinMode: (data as any)?.joinMode ?? "INSTANT",
      conditions: (data as any)?.conditions,
      items: (data as any)?.items,
      distanceText: "0km",
      meetingTimeText: undefined,
      host,
      myState: { membershipStatus: "HOST", canJoin: false } as any,
      address: (loc as any)?.address ?? undefined,
    } as any;

    _DATA.unshift(normalizeSeedToPost(newPost as any));
    return clonePost(_DATA[0]);
  },

  async updateMeeting(id, patch: Partial<MeetingUpsert>) {
    await delay(800);
    const idx = _DATA.findIndex((m) => String((m as any)?.id) === String(id));
    if (idx === -1) throw new Error("Meeting not found");

    const prev = _DATA[idx];

    const nextLocation = (patch as any)?.location
      ? ({
          ...((prev as any)?.location ?? {}),
          ...((patch as any)?.location ?? {}),
          name: str(
            (patch as any)?.location?.name ?? (prev as any)?.location?.name,
            (prev as any)?.location?.name ?? "장소 미정",
          ),
          latitude:
            toNumberOrNull((patch as any)?.location?.latitude ?? (patch as any)?.location?.lat) ??
            (prev as any)?.location?.latitude ??
            null,
          longitude:
            toNumberOrNull((patch as any)?.location?.longitude ?? (patch as any)?.location?.lng) ??
            (prev as any)?.location?.longitude ??
            null,
        } as any)
      : (prev as any)?.location;

    const patchMax = (patch as any)?.capacity?.max ?? (patch as any)?.capacity?.total;
    const prevMax = num((prev as any)?.capacity?.max ?? (prev as any)?.capacity?.total, 4);
    const nextMax =
      typeof patchMax === "number" && Number.isFinite(patchMax) ? Math.max(1, Math.trunc(patchMax)) : prevMax;

    const prevCurrent = num((prev as any)?.capacity?.current, 0);
    const nextCurrent = Math.min(prevCurrent, nextMax);

    const next: MeetingPost = {
      ...(prev as any),
      ...(patch as any),
      meetingTime: (patch as any)?.meetingTime ?? (prev as any)?.meetingTime,
      location: nextLocation as any,
      capacity: { ...((prev as any)?.capacity ?? {}), max: nextMax, current: nextCurrent, total: nextMax } as any,
      title: ((patch as any)?.title?.trim() ? (patch as any)?.title : (prev as any)?.title) as any,
    } as any;

    (next as any).myState = recomputeMyState(next);
    _DATA[idx] = normalizeSeedToPost(next as any);

    return clonePost(_DATA[idx]);
  },

  async cancelMeeting(id) {
    await delay();
    const idx = _DATA.findIndex((m) => String((m as any)?.id) === String(id));
    if (idx === -1) throw new Error("Meeting not found");

    const target = _DATA[idx];
    _DATA.splice(idx, 1);

    return { post: clonePost({ ...(target as any), status: "CANCELED" } as any) };
  },

  async joinMeeting(id) {
    await delay();
    const idx = _DATA.findIndex((m) => String((m as any)?.id) === String(id));
    if (idx < 0) throw new Error("Meeting not found");

    const target = _DATA[idx];
    const max = num((target as any)?.capacity?.max ?? (target as any)?.capacity?.total, 0);
    const current = num((target as any)?.capacity?.current, 0);
    if (max > 0 && current >= max) throw new Error("Full");

    const isApproval = String((target as any)?.joinMode) === "APPROVAL";
    const newStatus: MembershipStatus = isApproval ? "PENDING" : "MEMBER";
    const newCurrent = isApproval ? current : current + 1;

    const nextPost: MeetingPost = {
      ...(target as any),
      capacity: { ...((target as any)?.capacity ?? {}), max, current: newCurrent, total: max } as any,
      myState: { membershipStatus: newStatus, canJoin: false } as any,
    } as any;

    _DATA[idx] = normalizeSeedToPost(nextPost as any);
    return { post: clonePost(_DATA[idx]), membershipStatus: newStatus };
  },

  async cancelJoin(id) {
    await delay();
    const idx = _DATA.findIndex((m) => String((m as any)?.id) === String(id));
    if (idx < 0) throw new Error("Meeting not found");

    const target = _DATA[idx];
    const max = num((target as any)?.capacity?.max ?? (target as any)?.capacity?.total, 0);
    const current = num((target as any)?.capacity?.current, 0);
    const isMember = String((target as any)?.myState?.membershipStatus) === "MEMBER";

    const nextPost: MeetingPost = {
      ...(target as any),
      capacity: {
        ...((target as any)?.capacity ?? {}),
        max,
        current: isMember ? Math.max(0, current - 1) : current,
        total: max,
      } as any,
      myState: { membershipStatus: "NONE", ...calcCanJoin(target) } as any,
    } as any;

    _DATA[idx] = normalizeSeedToPost(nextPost as any);
    return { post: clonePost(_DATA[idx]) };
  },

  async getParticipants(meetingId) {
    await delay();
    const key = String(meetingId);
    ensureParticipants(key);
    return (_PARTICIPANTS[key] ?? []).map((p) => ({ ...(p as any) })) as any;
  },

  async approveParticipant(meetingId, userId) {
    await delay(500);
    const key = String(meetingId);
    ensureParticipants(key);

    const list = _PARTICIPANTS[key] ?? [];
    const target = list.find((p) => String((p as any)?.id) === String(userId));

    if (target && (target as any)?.status === "PENDING") {
      (target as any).status = "MEMBER";

      const mIdx = _DATA.findIndex((m) => String((m as any)?.id) === key);
      if (mIdx > -1) {
        const m = _DATA[mIdx];
        const max = num((m as any)?.capacity?.max ?? (m as any)?.capacity?.total, 0);
        const current = num((m as any)?.capacity?.current, 0);
        const next = max > 0 ? Math.min(max, current + 1) : current + 1;

        _DATA[mIdx] = normalizeSeedToPost({
          ...(m as any),
          capacity: { ...((m as any)?.capacity ?? {}), max, current: next, total: max },
        });
        (_DATA[mIdx] as any).myState = recomputeMyState(_DATA[mIdx]);
      }
    }

    return list.map((p) => ({ ...(p as any) })) as any;
  },

  async rejectParticipant(meetingId, userId) {
    await delay(500);
    const key = String(meetingId);
    ensureParticipants(key);

    const list = _PARTICIPANTS[key] ?? [];
    const target = list.find((p) => String((p as any)?.id) === String(userId));
    if (target) (target as any).status = "REJECTED";

    return list.map((p) => ({ ...(p as any) })) as any;
  },

  async submitMeetingRating(req: { meetingId: string; stars: number }): Promise<unknown> {
    await delay(500);

    const meetingId = String((req as any)?.meetingId);
    const stars = clamp(Number((req as any)?.stars ?? 0), 1, 5);
    _MEETING_LAST_STARS[meetingId] = stars;

    const idx = _DATA.findIndex((m) => String((m as any)?.id) === meetingId);
    if (idx < 0) throw new Error("Meeting not found");

    const post = _DATA[idx];
    if ((post as any)?.host) {
      (post as any).host = {
        ...((post as any).host ?? {}),
        avgRate: stars,
        orgTime: Math.max(0, Math.trunc(num(((post as any)?.host as any)?.orgTime ?? 0, 0))) + 1,
      } as any;
    }

    _DATA[idx] = normalizeSeedToPost(post as any);
    return { ok: true, stars };
  },
};

// -----------------------------------------------------------------------------
// Remote Implementation (meetingApi.remote.ts 통합)
// - 신청/처리 API는 서버 규격을 강제:
//   - 신청 POST: 성공/실패 모두 string 가능 (DTO 기대 금지)
//   - 처리 PATCH: body는 반드시 JSON string ("MEMBER" | "REJECTED")
// -----------------------------------------------------------------------------
function pickDefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

function ensureArrayRemote<T>(v: T | T[] | null | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

const isMeetingPostDTO = (v: unknown): v is MeetingPostDTO => {
  if (!isRecord(v)) return false;
  return (
    typeof (v as any).id === "number" &&
    typeof (v as any).title === "string" &&
    typeof (v as any).meetingTime === "string" &&
    typeof (v as any).state === "string" &&
    typeof (v as any).joinMode === "string" &&
    typeof (v as any).category === "string"
  );
};

const isApplicantDTO = (v: unknown): v is ApplicantDTO => {
  if (!isRecord(v)) return false;
  return typeof (v as any).postId === "number" && typeof (v as any).userId === "string" && typeof (v as any).state === "string";
};

const timeMs = (iso?: string) => {
  const t = iso ? new Date(iso).getTime() : Number.NaN;
  return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER;
};

async function safeFetchPost(id: number | string): Promise<MeetingPost | null> {
  try {
    const res = await client.get<unknown>(endpoints.posts.byId(id));
    if (!isMeetingPostDTO(res.data)) return null;
    return toMeetingPost(res.data);
  } catch {
    return null;
  }
}

type ApplicantDecisionBody = "MEMBER" | "REJECTED";

async function patchApplicantState(meetingId: number | string, userId: string, state: ApplicantDecisionBody) {
  const url = endpoints.posts.decideApplicant(meetingId, userId);

  // ✅ 서버 규격: body는 반드시 JSON string ("MEMBER" | "REJECTED")
  // - axios에 문자열을 그대로 넣으면 quotes 없이 전송될 수 있어 JSON.stringify로 강제
  await client.patch(url, JSON.stringify(state), {
    headers: { "Content-Type": "application/json" },
  });
}

export const meetingApiRemote: MeetingApi = {
  async listHotMeetings({ limit = 6, withinMinutes = 180 } = {}) {
    const anyOpts = (arguments[0] ?? {}) as any;
    const latitude = anyOpts?.latitude ?? anyOpts?.lat;
    const longitude = anyOpts?.longitude ?? anyOpts?.lng;
    const radiusMeters =
      anyOpts?.radiusMeters ?? (typeof anyOpts?.radiusKm === "number" ? anyOpts.radiusKm * 1000 : undefined);

    let list: MeetingPost[] = [];

    try {
      if (typeof latitude === "number" && typeof longitude === "number") {
        const res = await client.get<unknown>(endpoints.posts.hot, {
          params: pickDefined({ latitude, longitude, radiusMeters }),
        });
        list = ensureArrayRemote(res.data as any)
          .filter(isMeetingPostDTO)
          .map((dto) => {
            try {
              return toMeetingPost(dto);
            } catch {
              return null;
            }
          })
          .filter(Boolean) as MeetingPost[];
      } else {
        const res = await client.get<unknown>(endpoints.posts.list);
        list = ensureArrayRemote(res.data as any)
          .filter(isMeetingPostDTO)
          .map((dto) => {
            try {
              return toMeetingPost(dto);
            } catch {
              return null;
            }
          })
          .filter(Boolean) as MeetingPost[];
      }
    } catch {
      list = [];
    }

    const hot = list
      .filter((m) => (m as any)?.status === "OPEN")
      .filter((m) => {
        const max = Number((m as any)?.capacity?.max ?? (m as any)?.capacity?.total ?? 0);
        const current = Number((m as any)?.capacity?.current ?? 0);
        if (!Number.isFinite(max) || max <= 0) return false;
        if (!Number.isFinite(current)) return false;
        return Math.max(0, max - current) <= 2;
      })
      .map((m) => {
        const mt = (m as any)?.meetingTime as string | undefined;
        const min = (timeMs(mt) - Date.now()) / 60000;
        return { m, min: Number.isFinite(min) ? min : Number.POSITIVE_INFINITY };
      })
      .filter(({ min }) => (withinMinutes == null ? true : min >= 0 && min <= withinMinutes))
      .sort((a, b) => a.min - b.min)
      .slice(0, limit)
      .map(({ m, min }) => ({
        id: `hot-${(m as any)?.id}`,
        meetingId: (m as any)?.id,
        badge:
          Number.isFinite(min) && min >= 0
            ? min < 60
              ? `${Math.floor(min)}분 남음`
              : `${Math.floor(min / 60)}시간 남음`
            : "마감임박",
        title: (m as any)?.title ?? "",
        location: { ...((m as any)?.location ?? {}) },
        capacity: { ...((m as any)?.capacity ?? {}) },
      })) as HotMeetingItem[];

    return hot;
  },

  async listMeetings({ category = "ALL", sort } = {}) {
    const serverCategory = category === "ALL" ? null : toPostCategory(category);
    const url = serverCategory ? endpoints.posts.byCategory(serverCategory) : endpoints.posts.list;

    const res = await client.get<unknown>(url);

    const list = ensureArrayRemote(res.data as any)
      .filter(isMeetingPostDTO)
      .map((dto) => {
        try {
          return toMeetingPost(dto);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as MeetingPost[];

    if (sort === "SOON") {
      return [...list].sort((a, b) => timeMs((a as any)?.meetingTime) - timeMs((b as any)?.meetingTime));
    }
    if (sort === "LATEST") {
      return [...list].sort((a, b) => String((b as any)?.id ?? "").localeCompare(String((a as any)?.id ?? "")));
    }
    return list;
  },

  async listMeetingsAround(lat, lng, { radiusKm = 1, category, sort } = {}) {
    const serverCategory = category && category !== "ALL" ? toPostCategory(category) : undefined;

    const res = await client.get<unknown>(endpoints.posts.nearby, {
      params: pickDefined({
        latitude: lat,
        longitude: lng,
        radiusMeters: radiusKm * 1000,
        category: serverCategory,
        sort,
      }),
    });

    return ensureArrayRemote(res.data as any)
      .filter(isMeetingPostDTO)
      .map((dto) => {
        try {
          return toMeetingPost(dto);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as MeetingPost[];
  },

  async getMeeting(id) {
    const res = await client.get<unknown>(endpoints.posts.byId(id));
    if (!isMeetingPostDTO(res.data)) {
      return { id: String(id), status: "OPEN" } as unknown as MeetingPost;
    }
    return toMeetingPost(res.data);
  },

  async createMeeting(data: MeetingUpsert) {
    const payload = toPostCreateRequest(data);
    const res = await client.post<unknown>(endpoints.posts.create, pickDefined(payload));
    if (!isMeetingPostDTO(res.data)) {
      return { id: "0", status: "OPEN" } as unknown as MeetingPost;
    }
    return toMeetingPost(res.data);
  },

  async updateMeeting(id, patch: Partial<MeetingUpsert>) {
    const payload = toPostUpdateRequest(patch);
    const res = await client.put<unknown>(endpoints.posts.byId(id), pickDefined(payload));
    if (!isMeetingPostDTO(res.data)) {
      return { id: String(id), status: "OPEN" } as unknown as MeetingPost;
    }
    return toMeetingPost(res.data);
  },

  async cancelMeeting(id) {
    const before = await safeFetchPost(id);
    await client.delete(endpoints.posts.byId(id));

    return {
      post: before ? ({ ...(before as any), status: "CANCELED" } as MeetingPost) : ({ id: String(id), status: "CANCELED" } as unknown as MeetingPost),
    };
  },

  async joinMeeting(id) {
    // ✅ 서버 규격: Body 없음, 성공도 string 가능 → DTO 기대 금지
    const before = await safeFetchPost(id);
    await client.post<unknown>(endpoints.posts.applicants(id));

    const post = (await safeFetchPost(id)) ?? before ?? ({ id: String(id) } as unknown as MeetingPost);

    // ✅ 가능하면 서버가 내려준 myState를 우선(불일치/지연 대비), 없으면 joinMode로 추론
    const serverStatus = post?.myState?.membershipStatus;
    const fallback: MembershipStatus =
      post?.joinMode === "APPROVAL" ? "PENDING" : "MEMBER";

    const membershipStatus: MembershipStatus =
      serverStatus && serverStatus !== "NONE" ? serverStatus : fallback;

    return { post, membershipStatus };
  },

  async cancelJoin(id) {
    // ✅ 서버 규격: 성공 string 가능, 실패는 ErrorResponse/string 가능
    await client.delete(endpoints.posts.applicants(id));
    const post = (await safeFetchPost(id)) ?? ({ id: String(id) } as unknown as MeetingPost);
    return { post };
  },

  async getParticipants(meetingId) {
    const res = await client.get<unknown>(endpoints.posts.applicants(meetingId));

    const list = ensureArrayRemote(res.data as any)
      .filter(isApplicantDTO)
      .map((dto) => {
        try {
          return toParticipant(dto);
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Participant[];

    return list;
  },

  async approveParticipant(meetingId, userId) {
    // ✅ 서버 규격: PATCH body는 JSON string "MEMBER"
    await patchApplicantState(meetingId, String(userId), "MEMBER");
    return this.getParticipants(meetingId);
  },

  async rejectParticipant(meetingId, userId) {
    // ✅ 서버 규격: PATCH body는 JSON string "REJECTED"
    await patchApplicantState(meetingId, String(userId), "REJECTED");
    return this.getParticipants(meetingId);
  },

  async submitMeetingRating(req: { meetingId: string; stars: number }): Promise<unknown> {
    await client.post(endpoints.posts.ratings(req.meetingId), {
      score: req.stars,
      stars: req.stars,
    } as any);
    return { ok: true };
  },
};

// -----------------------------------------------------------------------------
// Facade Export (meetingApi.ts 통합)
// -----------------------------------------------------------------------------
export const meetingApi: MeetingApiWithUnsafe = USE_MOCK
  ? meetingApiLocal
  : ({
      ...meetingApiRemote,
      __getMockDataUnsafe: () => [],
    } as MeetingApiWithUnsafe);

if (__DEV__) {
  console.log(`[Meeting API] Current Mode: ${__MEETING_API_MODE__.toUpperCase()}`);
}

export default meetingApi;