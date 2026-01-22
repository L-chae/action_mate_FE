import { client } from "@/shared/api/apiClient";

// endpoints는 프로젝트 상황에 맞게 문자열로 직접 넣거나 import 하세요.
const endpoints = {
  posts: {
    base: "/posts",
    byCategory: (cat: string) => `/posts/category/${cat}`,
    nearby: "/posts/nearby",
    byId: (id: string | number) => `/posts/id/${id}`,
    applicants: (id: string | number) => `/posts/${id}/applicants`,
    decideApplicant: (pid: string | number, uid: string) => `/posts/${pid}/applicants/${uid}`,
    ratings: (id: string | number) => `/posts/${id}/ratings`,
  }
};

import type { 
  MeetingApi, 
  MeetingPost, 
  MeetingParams
} from "../model/types";
import type { MeetingPostDTO, ApplicantDTO } from "../model/dto";
import { toMeetingPost, toParticipant } from "../model/mapper";

export const meetingApiRemote: MeetingApi = {
  // 1. 핫한 모임
  async listHotMeetings({ limit = 6 } = {}) {
    const res = await client.get<MeetingPostDTO[]>(endpoints.posts.base);
    
    return res.data
      .map(toMeetingPost)
      .slice(0, limit)
      .map((m) => ({
        id: `hot-${m.id}`,
        meetingId: m.id,
        badge: "마감임박",
        title: m.title,
        place: m.location.name,
        capacityJoined: m.capacity.current,
        capacityTotal: m.capacity.total,
      }));
  },

  // 2. 모임 목록
  async listMeetings({ category = "ALL" } = {}) {
    let url = endpoints.posts.base;
    if (category !== "ALL") {
      url = endpoints.posts.byCategory(category);
    }

    const res = await client.get<MeetingPostDTO[]>(url);
    return res.data.map(toMeetingPost);
  },

  // 3. 주변 모임
  async listMeetingsAround(lat, lng, { radiusKm = 1 } = {}) {
    const res = await client.get<MeetingPostDTO[]>(endpoints.posts.nearby, {
      params: {
        latitude: lat,
        longitude: lng,
        radiusMeters: radiusKm * 1000,
      },
    });
    return res.data.map(toMeetingPost);
  },

  // 4. 상세 조회
  async getMeeting(id) {
    const res = await client.get<MeetingPostDTO>(endpoints.posts.byId(id));
    return toMeetingPost(res.data);
  },

  // 5. 생성
  async createMeeting(data: MeetingParams) {
    const payload = {
      category: data.category,
      title: data.title,
      content: data.content,
      meetingTime: data.meetingTimeIso,
      
      locationName: data.locationText, 
      latitude: data.locationLat,
      longitude: data.locationLng,
      
      joinMode: data.joinMode,
      // 백엔드 명세상 capacityTotal 필드 확인 필요
    };

    const res = await client.post<MeetingPostDTO>(endpoints.posts.base, payload);
    return toMeetingPost(res.data);
  },

  // 6. 수정
  async updateMeeting(id, data) {
    const payload = {
      category: data.category,
      title: data.title,
      content: data.content,
      meetingTime: data.meetingTimeIso,
      latitude: data.locationLat,
      longitude: data.locationLng,
      joinMode: data.joinMode,
    };

    const res = await client.put<MeetingPostDTO>(endpoints.posts.byId(id), payload);
    return toMeetingPost(res.data);
  },

  // 7. 삭제/취소
  async cancelMeeting(id) {
    await client.delete(endpoints.posts.byId(id));
    return { 
      post: { 
        id, 
        status: "CANCELED" // ✅ state -> status 수정
      } as unknown as MeetingPost 
    };
  },

  // 8. 참여하기
  async joinMeeting(id) {
    const res = await client.post<ApplicantDTO>(endpoints.posts.applicants(id));
    
    const statusMap: Record<string, any> = {
      APPROVED: "MEMBER",
      PENDING: "PENDING",
      REJECTED: "REJECTED",
    };
    const newStatus = statusMap[res.data.state] || "PENDING";

    return {
      post: { id } as unknown as MeetingPost,
      membershipStatus: newStatus
    };
  },

  // 9. 참여 취소
  async cancelJoin(id) {
    await client.delete(endpoints.posts.applicants(id));
    return { post: { id } as unknown as MeetingPost };
  },

  // 10. 참여자 목록
  async getParticipants(meetingId) {
    const res = await client.get<ApplicantDTO[]>(endpoints.posts.applicants(meetingId));
    return res.data.map(toParticipant);
  },

  // 11. 승인
  async approveParticipant(meetingId, userId) {
    await client.patch(endpoints.posts.decideApplicant(meetingId, userId), "APPROVED");
    return this.getParticipants(meetingId);
  },

  // 12. 거절
  async rejectParticipant(meetingId, userId) {
    await client.patch(endpoints.posts.decideApplicant(meetingId, userId), "REJECTED");
    return this.getParticipants(meetingId);
  },
};