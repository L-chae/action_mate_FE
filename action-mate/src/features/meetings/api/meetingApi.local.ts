// src/features/meetings/api/meetingApi.local.ts (최종본)
// ✅ 평가(0~5 정수) 제출 시: 대상 유저별로 누적 평균 -> 온도(32~42) 갱신
// ✅ __getUserTempUnsafe 제공: myApi에서 "me" 온도 읽기용

import { MeetingApi } from "./meetingApi";
import { MOCK_MEETINGS_SEED, HOST_USERS } from "../mocks/meetingMockData";
import { MeetingPost, MeetingParams, HomeSort, Participant } from "../model/types";
import type { ParticipantEvaluation, MannerEvaluationResponse } from "../model/evaluation.types";

// =====================
// Local State (Mock)
// =====================
let _DATA: MeetingPost[] = JSON.parse(JSON.stringify(MOCK_MEETINGS_SEED));
const _PARTICIPANTS: Record<string, Participant[]> = {};
const _EVALUATED: Record<string, boolean> = {};

// ✅ 유저별 평가 누적(내가 받은 평가가 쌓이는 구조)
type UserRatingAgg = { sum: number; count: number };
const _USER_RATING_AGG: Record<string, UserRatingAgg> = {};

// =====================
// Helpers
// =====================
const delay = (ms = 500) => new Promise((r) => setTimeout(r, ms));
const toTimeMs = (iso?: string) => (iso ? new Date(iso).getTime() : Number.MAX_SAFE_INTEGER);

function clampInt(n: number, min: number, max: number) {
  const v = Math.round(Number(n) || 0);
  return Math.max(min, Math.min(max, v));
}

// ✅ 평균 별점(0~5 정수/실수 모두 들어와도 됨) -> 온도(32~42)
// - 0점: 32
// - 5점: 42
// - 1점당 +2도
const ratingToTemp = (rating: number) => {
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  return 32 + r * 2;
};

// ✅ HOST_USERS에 유저가 없을 수도 있으니 안전하게 업데이트
function setUserTempUnsafe(userId: string, nextTemp: number) {
  const temp = Math.max(32, Math.min(42, Number(nextTemp) || 36.5));

  // HOST_USERS 구조가 "me" / "u1" / ... 처럼 키일 수도, 배열/맵일 수도 있어서 최대한 안전하게
  const anyUsers = HOST_USERS as any;

  if (anyUsers?.[userId]) {
    anyUsers[userId].mannerTemp = Number(temp.toFixed(1));
    return;
  }

  // 못 찾으면 그냥 누적 데이터만 유지(그래도 __getUserTempUnsafe는 여기서 읽어갈 수 있음)
}

// ✅ 자동 종료 판정 (meetingTime + durationMinutes)
const computeAutoStatus = (m: MeetingPost) => {
  if (m.status === "CANCELED") return m.status;

  const startMs = toTimeMs(m.meetingTime);
  if (!Number.isFinite(startMs)) return m.status;

  const durationMin =
    typeof (m as any).durationMinutes === "number" ? (m as any).durationMinutes : 0;

  const endMs = startMs + Math.max(0, durationMin) * 60_000;
  return Date.now() >= endMs ? ("ENDED" as any) : m.status;
};

const withAutoEnded = (m: MeetingPost): MeetingPost => {
  const status = computeAutoStatus(m);
  return {
    ...m,
    status,
    myState: m.myState ? { ...m.myState, canJoin: status === "OPEN" } : m.myState,
  } as any;
};

// =====================
// Participants Mock
// =====================
const ensureParticipants = (meetingId: string) => {
  if (_PARTICIPANTS[meetingId]) return;

  const meeting = _DATA.find((m) => String(m.id) === String(meetingId));
  const host = meeting?.host;

  const list: Participant[] = [];

  // ✅ 1) 호스트 포함
  if (host?.id) {
    list.push({
      userId: host.id,
      nickname: host.nickname,
      avatarUrl: (host as any)?.avatarUrl ?? undefined,
      status: "MEMBER",
      appliedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    });
  }

  // ✅ 2) 나(me) 포함 (목업 테스트)
  list.push({
    userId: "me",
    nickname: "나",
    avatarUrl: "https://i.pravatar.cc/150?u=me_eval",
    status: "MEMBER",
    appliedAt: new Date(Date.now() - 1000 * 60 * 160).toISOString(),
  });

  // ✅ 3) 다른 멤버
  list.push(
    {
      userId: "u_test_1",
      nickname: "테니스왕",
      avatarUrl: undefined,
      status: "MEMBER",
      appliedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    },
    {
      userId: "u_test_2",
      nickname: "초보에요",
      avatarUrl: undefined,
      status: "MEMBER",
      appliedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    }
  );

  // ✅ 중복 제거
  const uniq = new Map<string, Participant>();
  for (const p of list) uniq.set(p.userId, p);

  _PARTICIPANTS[meetingId] = Array.from(uniq.values());
};

// =====================
// Distance / Sort Utils
// =====================
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
  if (text.includes("m") && !text.includes("km")) return val / 1000;
  return val;
}

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
    if (sort === "SOON") return toTimeMs(a.meetingTime) - toTimeMs(b.meetingTime);
    return Number(b.id) - Number(a.id);
  });
}

// =====================
// Mock API
// =====================
export const meetingApiLocal: MeetingApi = {
  async listHotMeetings({ limit = 6, withinMinutes = 180 } = {}) {
    await delay();
    const now = Date.now();
    return _DATA
      .map(withAutoEnded)
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

  async listMeetings({ category = "ALL", sort = "LATEST" } = {}) {
    await delay();
    const list = category === "ALL" ? _DATA : _DATA.filter((m) => m.category === category);
    return sortList(list.map(withAutoEnded), sort);
  },

  async listMeetingsAround(lat, lng, { radiusKm = 3, category = "ALL", sort = "NEAR" } = {}) {
    await delay();
    let candidates = _DATA.filter((m) => m.locationLat && m.locationLng);
    if (category !== "ALL") candidates = candidates.filter((m) => m.category === category);

    const within = candidates
      .map((m) => ({
        m: withAutoEnded(m),
        dist: haversineKm(lat, lng, m.locationLat!, m.locationLng!),
      }))
      .filter(({ dist }) => dist <= radiusKm);

    return within.map(({ m, dist }) => ({
      ...m,
      distanceText: dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`,
    }));
  },

  async getMeeting(id: string) {
    await delay();
    const found = _DATA.find((m) => String(m.id) === String(id));
    if (!found) throw new Error("Meeting not found");

    const computed = withAutoEnded(found);

    return {
      ...computed,
      hasEvaluated: !!_EVALUATED[String(id)],
    } as any;
  },

  async createMeeting(data: MeetingParams) {
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
      host: {
        id: "me",
        nickname: "나(Host)",
        mannerTemp: __getUserTempUnsafe("me"),
        kudosCount: 0,
        intro: "안녕하세요!",
      },
    };

    _DATA.unshift(newPost);
    return newPost;
  },

  async updateMeeting(id: string, data: MeetingParams) {
    await delay(800);
    const idx = _DATA.findIndex((m) => String(m.id) === String(id));
    if (idx === -1) throw new Error("Meeting not found");

    const prev = _DATA[idx];
    _DATA[idx] = {
      ...prev,
      ...data,
      meetingTime: data.meetingTimeIso ?? prev.meetingTime,
      durationMinutes: data.durationMinutes ?? (prev as any).durationMinutes,
    } as any;

    return { ..._DATA[idx] };
  },

  async joinMeeting(id: string) {
    await delay();
    const idx = _DATA.findIndex((m) => String(m.id) === String(id));
    if (idx < 0) throw new Error("Meeting not found");

    const target = _DATA[idx];
    const isApproval = target.joinMode === "APPROVAL";
    const newStatus = isApproval ? "PENDING" : "MEMBER";

    const newState: MeetingPost = {
      ...target,
      capacityJoined: isApproval ? target.capacityJoined : target.capacityJoined + 1,
      myState: { membershipStatus: newStatus, canJoin: false },
    };

    _DATA[idx] = newState;
    return { post: newState, membershipStatus: newStatus };
  },

  async cancelJoin(id: string) {
    await delay();
    const idx = _DATA.findIndex((m) => String(m.id) === String(id));
    if (idx < 0) throw new Error("Meeting not found");

    const target = _DATA[idx];
    const currentStatus = target.myState?.membershipStatus;

    const newState: MeetingPost = {
      ...target,
      capacityJoined:
        currentStatus === "MEMBER" ? Math.max(0, target.capacityJoined - 1) : target.capacityJoined,
      myState: { membershipStatus: "NONE", canJoin: true },
    };

    _DATA[idx] = newState;
    return { post: newState };
  },

  async cancelMeeting(id: string) {
    await delay();
    const idx = _DATA.findIndex((m) => String(m.id) === String(id));
    if (idx < 0) throw new Error("Meeting not found");
    const deletedItem = _DATA[idx];
    _DATA.splice(idx, 1);
    return { post: { ...deletedItem, status: "CANCELED" } };
  },

  async getParticipants(meetingId: string) {
    await delay();
    ensureParticipants(String(meetingId));
    return [..._PARTICIPANTS[String(meetingId)]];
  },

  async approveParticipant(meetingId: string, userId: string) {
    await delay();
    ensureParticipants(String(meetingId));

    const list = _PARTICIPANTS[String(meetingId)];
    const p = list.find((x) => x.userId === userId);

    if (p && p.status !== "MEMBER") {
      p.status = "MEMBER";

      // ✅ 승인 시 인원수 증가(+1)
      const mIdx = _DATA.findIndex((m) => String(m.id) === String(meetingId));
      if (mIdx > -1) _DATA[mIdx].capacityJoined += 1;
    }

    return [...list];
  },

  async rejectParticipant(meetingId: string, userId: string) {
    await delay();
    ensureParticipants(String(meetingId));

    const list = _PARTICIPANTS[String(meetingId)];
    const p = list.find((x) => x.userId === userId);
    if (p) p.status = "REJECTED";

    return [...list];
  },

  // ✅ 평가 제출: 대상 유저별로 "내가 받은 평가" 누적 -> 평균 -> 온도 갱신
  async submitMannerEvaluation(
    meetingId: string,
    evaluations: ParticipantEvaluation[]
  ): Promise<MannerEvaluationResponse> {
    await delay();
    _EVALUATED[String(meetingId)] = true;

    const safe = Array.isArray(evaluations) ? evaluations : [];

    for (const e of safe) {
      const targetUserId = String((e as any).targetUserId ?? "");
      if (!targetUserId) continue;

      const rating = clampInt((e as any).rating, 0, 5);

      const prev = _USER_RATING_AGG[targetUserId] ?? { sum: 0, count: 0 };
      const next = { sum: prev.sum + rating, count: prev.count + 1 };
      _USER_RATING_AGG[targetUserId] = next;

      const avg = next.count > 0 ? next.sum / next.count : 0;
      const temp = ratingToTemp(avg);

      setUserTempUnsafe(targetUserId, temp);
    }

    // ✅ meeting의 host 정보도 최신 온도로 맞춰주기(화면 즉시 반영용)
    const idx = _DATA.findIndex((m) => String(m.id) === String(meetingId));
    if (idx > -1) {
      const hostId = _DATA[idx]?.host?.id;
      if (hostId) {
        (_DATA[idx] as any).host = {
          ...(_DATA[idx] as any).host,
          mannerTemp: __getUserTempUnsafe(hostId),
        };
      }
    }

    return { ok: true, meetingId: String(meetingId), hasEvaluated: true };
  },
};

// =====================
// Unsafe exports (Mock only)
// =====================
export function __getMockDataUnsafe() {
  return _DATA;
}

// ✅ myApi에서 "me" 온도 읽을 때 사용
export function __getUserTempUnsafe(userId: string) {
  // 1) HOST_USERS에 있으면 우선
  const anyUsers = HOST_USERS as any;
  const fromHostUsers = anyUsers?.[userId]?.mannerTemp;
  if (typeof fromHostUsers === "number") return Number(fromHostUsers.toFixed(1));

  // 2) 누적 평가가 있으면 평균 기반으로 계산
  const agg = _USER_RATING_AGG[userId];
  if (agg?.count) {
    const avg = agg.sum / agg.count;
    return Number(ratingToTemp(avg).toFixed(1));
  }

  // 3) 기본
  return 36.5;
}
