// src/features/meetings/api/meetingApi.remote.ts
import { client } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/api/endpoints";
import type { MeetingApi, MeetingPost, MeetingUpsert, HotMeetingItem } from "../model/types";
import type { MeetingPostDTO, ApplicantDTO } from "../model/dto";
import {
  toMeetingPost,
  toParticipant,
  toPostCategory,
  toPostCreateRequest,
  toPostUpdateRequest,
  toMembershipStatusFromApplicant,
} from "../model/mappers";

/**
 * undefined는 payload에서 제거(서버가 "없는 필드"에 엄격할 수 있어서 방어)
 */
function pickDefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/**
 * 서버가 배열/단건을 섞어 리턴하는 경우를 방어
 */
function ensureArray<T>(v: T | T[] | null | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * 삭제/조인/취소 등에서 최소 응답만 주는 서버 대비:
 * 가능한 경우 최신 Post를 한번 읽어와 UI 일관성을 유지
 */
async function safeFetchPost(id: number | string): Promise<MeetingPost | null> {
  try {
    const res = await client.get<MeetingPostDTO>(endpoints.posts.byId(id));
    return toMeetingPost(res.data);
  } catch {
    return null;
  }
}

function minutesUntil(iso?: string) {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  return (t - Date.now()) / 60000;
}

function remainingSeats(post: MeetingPost) {
  const max = Number((post.capacity as any)?.max ?? (post.capacity as any)?.total ?? 0);
  const current = Number((post.capacity as any)?.current ?? 0);
  if (!Number.isFinite(max) || max <= 0) return 999;
  if (!Number.isFinite(current)) return 999;
  return Math.max(0, max - current);
}

async function patchApplicantState(meetingId: number | string, userId: string, state: "APPROVED" | "REJECTED") {
  const url = endpoints.posts.decideApplicant(meetingId, userId);

  // 1) JSON 시도
  try {
    await client.patch(url, { state }, { headers: { "Content-Type": "application/json" } });
    return;
  } catch {
    // 2) text/plain 시도(서버가 문자열만 받는 경우)
    await client.patch(url, state, { headers: { "Content-Type": "text/plain" } });
  }
}

export const meetingApiRemote: MeetingApi = {
  // 1) 핫한 모임
  async listHotMeetings({ limit = 6, withinMinutes = 180 } = {}) {
    const anyOpts = (arguments[0] ?? {}) as any;
    const latitude = anyOpts?.latitude ?? anyOpts?.lat;
    const longitude = anyOpts?.longitude ?? anyOpts?.lng;
    const radiusMeters =
      anyOpts?.radiusMeters ?? (typeof anyOpts?.radiusKm === "number" ? anyOpts.radiusKm * 1000 : undefined);

    let list: MeetingPost[] = [];

    if (typeof latitude === "number" && typeof longitude === "number") {
      const res = await client.get<MeetingPostDTO[] | MeetingPostDTO>(endpoints.posts.hot, {
        params: pickDefined({
          latitude,
          longitude,
          radiusMeters,
        }),
      });
      list = ensureArray(res.data).map(toMeetingPost);
    } else {
      const res = await client.get<MeetingPostDTO[] | MeetingPostDTO>(endpoints.posts.list);
      list = ensureArray(res.data).map(toMeetingPost);
    }

    const hot = list
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
      })) as HotMeetingItem[];

    return hot;
  },

  // 2) 모임 목록
  async listMeetings({ category = "ALL", sort } = {}) {
    const serverCategory = category === "ALL" ? null : toPostCategory(category);
    const url = serverCategory ? endpoints.posts.byCategory(serverCategory) : endpoints.posts.list;

    const res = await client.get<MeetingPostDTO[] | MeetingPostDTO>(url);
    const list = ensureArray(res.data).map(toMeetingPost);

    if (sort === "SOON") {
      return [...list].sort((a, b) => new Date(a.meetingTime).getTime() - new Date(b.meetingTime).getTime());
    }
    if (sort === "LATEST") {
      return [...list].sort((a, b) => String(b.id).localeCompare(String(a.id)));
    }
    return list;
  },

  // 3) 주변 모임
  async listMeetingsAround(lat, lng, { radiusKm = 1, category, sort } = {}) {
    const serverCategory = category && category !== "ALL" ? toPostCategory(category) : undefined;

    const res = await client.get<MeetingPostDTO[] | MeetingPostDTO>(endpoints.posts.nearby, {
      params: pickDefined({
        latitude: lat,
        longitude: lng,
        radiusMeters: radiusKm * 1000,
        category: serverCategory,
        sort,
      }),
    });

    return ensureArray(res.data).map(toMeetingPost);
  },

  // 4) 상세 조회
  async getMeeting(id) {
    const res = await client.get<MeetingPostDTO>(endpoints.posts.byId(id));
    return toMeetingPost(res.data);
  },

  // 5) 생성
  async createMeeting(data: MeetingUpsert) {
    const payload = toPostCreateRequest(data);
    const res = await client.post<MeetingPostDTO>(endpoints.posts.create, pickDefined(payload));
    return toMeetingPost(res.data);
  },

  // 6) 수정
  async updateMeeting(id, patch: Partial<MeetingUpsert>) {
    const payload = toPostUpdateRequest(patch);
    const res = await client.put<MeetingPostDTO>(endpoints.posts.byId(id), pickDefined(payload));
    return toMeetingPost(res.data);
  },

  // 7) 삭제/취소
  async cancelMeeting(id) {
    const before = await safeFetchPost(id);
    await client.delete(endpoints.posts.byId(id));

    return {
      post: before ? { ...before, status: "CANCELED" } : ({ id: String(id), status: "CANCELED" } as unknown as MeetingPost),
    };
  },

  // 8) 참여하기
  async joinMeeting(id) {
    const res = await client.post<ApplicantDTO>(endpoints.posts.applicants(id));
    const membershipStatus = toMembershipStatusFromApplicant(res.data);

    const post = (await safeFetchPost(id)) ?? ({ id: String(id) } as unknown as MeetingPost);
    return { post, membershipStatus };
  },

  // 9) 참여 취소
  async cancelJoin(id) {
    await client.delete(endpoints.posts.applicants(id));
    const post = (await safeFetchPost(id)) ?? ({ id: String(id) } as unknown as MeetingPost);
    return { post };
  },

  // 10) 참여자 목록
  async getParticipants(meetingId) {
    const res = await client.get<ApplicantDTO[] | ApplicantDTO>(endpoints.posts.applicants(meetingId));
    return ensureArray(res.data).map(toParticipant);
  },

  // 11) 승인
  async approveParticipant(meetingId, userId) {
    await patchApplicantState(meetingId, String(userId), "APPROVED");
    return this.getParticipants(meetingId);
  },

  // 12) 거절
  async rejectParticipant(meetingId, userId) {
    await patchApplicantState(meetingId, String(userId), "REJECTED");
    return this.getParticipants(meetingId);
  },

  // 13) 별점 평가
  async submitMeetingRating(req: { meetingId: string; stars: number }): Promise<unknown> {
    // 서버 구현이 score/stars 중 하나만 받는 경우가 있어 둘 다 포함(호환성 ↑)
    await client.post(endpoints.posts.ratings(req.meetingId), {
      score: req.stars,
      stars: req.stars,
    } as any);
    return { ok: true };
  },
};

export default meetingApiRemote;