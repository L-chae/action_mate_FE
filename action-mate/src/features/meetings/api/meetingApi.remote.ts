// src/features/meetings/api/meetingApi.remote.ts
import { client } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/api/endpoints";

import type { MeetingApi, MeetingPost, MeetingUpsert, HotMeetingItem } from "../model/types";
import type { MeetingPostDTO, ApplicantDTO } from "../model/dto";
import { toMeetingPost, toParticipant } from "../model/mapper";

/**
 * undefined는 payload에서 제거(서버가 "없는 필드"에 엄격할 수 있어서 방어)
 */
function pickDefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/**
 * 삭제/조인/취소 등에서 최소 응답만 주는 서버를 대비해,
 * 가능한 경우 최신 Post를 한번 읽어와 UI 일관성을 유지합니다.
 */
async function safeFetchPost(id: number | string): Promise<MeetingPost | null> {
  try {
    const res = await client.get<MeetingPostDTO>(endpoints.posts.byId(id));
    return toMeetingPost(res.data);
  } catch {
    return null;
  }
}

export const meetingApiRemote: MeetingApi = {
  // 1) 핫한 모임
  async listHotMeetings({ limit = 6, withinMinutes } = {}) {
    // withinMinutes는 서버가 지원하지 않으면 클라이언트에서만 사용
    const res = await client.get<MeetingPostDTO[]>(endpoints.posts.create);

    return res.data
      .map(toMeetingPost)
      .slice(0, limit)
      .map((m) => ({
        id: `hot-${m.id}`,
        meetingId: m.id,
        badge: "마감임박",
        title: m.title,
        location: { ...m.location },
        capacity: { ...m.capacity },
      })) as HotMeetingItem[];
  },

  // 2) 모임 목록
  async listMeetings({ category = "ALL", sort } = {}) {
    // sort는 서버 지원 여부 불명확 → 미지원이면 그냥 무시
    const url = category === "ALL" ? endpoints.posts.create : endpoints.posts.byCategory(category);
    const res = await client.get<MeetingPostDTO[]>(url);
    const list = res.data.map(toMeetingPost);

    // 서버 sort 미지원 시에도 화면이 크게 틀어지지 않도록 최소 정렬 보정(옵션)
    if (sort === "SOON") {
      return [...list].sort((a, b) => new Date(a.meetingTime).getTime() - new Date(b.meetingTime).getTime());
    }
    if (sort === "LATEST") {
      // id가 문자열일 수 있으므로 문자열 비교
      return [...list].sort((a, b) => String(b.id).localeCompare(String(a.id)));
    }
    return list;
  },

  // 3) 주변 모임
  async listMeetingsAround(lat, lng, { radiusKm = 1, category, sort } = {}) {
    const res = await client.get<MeetingPostDTO[]>(endpoints.posts.nearby, {
      params: pickDefined({
        latitude: lat,
        longitude: lng,
        radiusMeters: radiusKm * 1000,
        category: category && category !== "ALL" ? category : undefined,
        sort,
      }),
    });

    return res.data.map(toMeetingPost);
  },

  // 4) 상세 조회
  async getMeeting(id) {
    const res = await client.get<MeetingPostDTO>(endpoints.posts.byId(id));
    return toMeetingPost(res.data);
  },

  // 5) 생성 (MeetingUpsert = 통일 Shape)
  async createMeeting(data: MeetingUpsert) {
    // ✅ 백엔드 v1.1.14: capacity(총원) 필드명 = capacity
    const payload = pickDefined({
      category: data.category,
      title: data.title,
      content: data.content,
      meetingTime: data.meetingTime,

      locationName: data.location.name,
      latitude: data.location.lat,
      longitude: data.location.lng,

      joinMode: data.joinMode,
      capacity: data.capacity.total,

      // 서버가 아직 안 받으면 undefined로 빠져나가도록 둠
      durationMinutes: data.durationMinutes,
      conditions: data.conditions,
      items: data.items,
    });

    const res = await client.post<MeetingPostDTO>(endpoints.posts.create, payload);
    return toMeetingPost(res.data);
  },

  // 6) 수정
  async updateMeeting(id, patch: Partial<MeetingUpsert>) {
    const payload = pickDefined({
      category: patch.category,
      title: patch.title,
      content: patch.content,
      meetingTime: patch.meetingTime,

      locationName: patch.location?.name,
      latitude: patch.location?.lat,
      longitude: patch.location?.lng,

      joinMode: patch.joinMode,
      capacity: patch.capacity?.total,

      durationMinutes: patch.durationMinutes,
      conditions: patch.conditions,
      items: patch.items,
    });

    const res = await client.put<MeetingPostDTO>(endpoints.posts.byId(id), payload);
    return toMeetingPost(res.data);
  },

  // 7) 삭제/취소
  async cancelMeeting(id) {
    const before = await safeFetchPost(id);
    await client.delete(endpoints.posts.byId(id));

    return {
      post: before
        ? { ...before, status: "CANCELED" }
        : ({ id: String(id), status: "CANCELED" } as unknown as MeetingPost),
    };
  },

  // 8) 참여하기
  async joinMeeting(id) {
    const res = await client.post<ApplicantDTO>(endpoints.posts.applicants(id));

    const statusMap: Record<string, any> = {
      APPROVED: "MEMBER",
      PENDING: "PENDING",
      REJECTED: "REJECTED",
    };
    const newStatus = statusMap[(res.data as any)?.state] || "PENDING";

    const post = (await safeFetchPost(id)) ?? ({ id: String(id) } as unknown as MeetingPost);

    return { post, membershipStatus: newStatus };
  },

  // 9) 참여 취소
  async cancelJoin(id) {
    await client.delete(endpoints.posts.applicants(id));
    const post = (await safeFetchPost(id)) ?? ({ id: String(id) } as unknown as MeetingPost);
    return { post };
  },

  // 10) 참여자 목록
  async getParticipants(meetingId) {
    const res = await client.get<ApplicantDTO[]>(endpoints.posts.applicants(meetingId));
    return res.data.map(toParticipant);
  },

  // 11) 승인
  async approveParticipant(meetingId, userId) {
    await client.patch(endpoints.posts.decideApplicant(meetingId, userId), "APPROVED");
    return this.getParticipants(meetingId);
  },

  // 12) 거절
  async rejectParticipant(meetingId, userId) {
    await client.patch(endpoints.posts.decideApplicant(meetingId, userId), "REJECTED");
    return this.getParticipants(meetingId);
  },

  // 13) 별점 평가
  async submitMeetingRating(req: { meetingId: string; stars: number }): Promise<unknown> {
    await client.post(endpoints.posts.ratings(req.meetingId), { stars: req.stars });
    return { ok: true };
  },
};

export default meetingApiRemote;