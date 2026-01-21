// src/features/meetings/api/meetingApi.remote.ts
import { client } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/api/endpoints";
import type { 
  MeetingApi, 
  MeetingPost, 
  HotMeetingItem,
  Participant 
} from "../model/types";

// ✅ 서버 응답 타입 정의 (DTO)
// 필요하다면 types.ts로 옮겨도 되지만, 여기서만 쓰이면 여기에 둬도 됨
type ServerPost = MeetingPost; // 지금은 구조가 거의 같다고 가정
type ServerApplicant = {
  postId: number;
  userId: string;
  state: "APPROVED" | "REJECTED" | "PENDING";
};

export const meetingApiRemote: MeetingApi = {
  // 1. 핫한 모임 (서버에 별도 API가 없으면 전체 조회 후 프론트 필터링 or 카테고리별 조회 대체)
  // 명세서에 "Hot" 전용 API가 없으므로 일단 '전체 조회' 후 가공하거나, 서버 개발자에게 요청 필요.
  // 여기서는 임시로 전체 조회를 호출함.
  async listHotMeetings({ limit = 6 } = {}) {
    // ⚠️ TODO: 서버에 /posts/hot API 만들어달라고 하기
    // 임시: 그냥 전체 조회해서 앞부분 자름
    const res = await client.get<ServerPost[]>(endpoints.posts.create); // GET /posts?
    // (만약 GET /posts가 없다면 카테고리별 조회로 대체해야 함)
    
    return res.data.slice(0, limit).map((m) => ({
      id: `hot-${m.id}`,
      meetingId: String(m.id),
      badge: "마감임박",
      title: m.title,
      place: m.locationText || "위치 미정",
      capacityJoined: m.capacityJoined,
      capacityTotal: m.capacityTotal,
    }));
  },

  // 2. 모임 목록 (카테고리별)
  async listMeetings({ category = "ALL" } = {}) {
    if (category === "ALL") {
      // 전체 조회 API가 명세에 정확히 없으므로, 카테고리별로 다 불러오거나 
      // "자유" 카테고리를 기본으로 부르는 등 정책 필요.
      // 일단 "자유" 카테고리 예시
      const res = await client.get<ServerPost[]>(endpoints.posts.byCategory("자유"));
      return res.data;
    }
    const res = await client.get<ServerPost[]>(endpoints.posts.byCategory(category));
    return res.data;
  },

  // 3. 주변 모임
  async listMeetingsAround(lat, lng, { radiusKm = 1 } = {}) {
    const res = await client.get<ServerPost[]>(endpoints.posts.nearby, {
      params: {
        latitude: lat,
        longitude: lng,
        radiusMeters: radiusKm * 1000,
      },
    });
    return res.data;
  },

  // 4. 상세 조회
  async getMeeting(id) {
    const res = await client.get<ServerPost>(endpoints.posts.byId(id));
    return res.data;
  },

  // 5. 생성
  async createMeeting(data) {
    const res = await client.post<ServerPost>(endpoints.posts.create, {
      category: data.category,
      title: data.title,
      content: data.content,
      meetingTime: data.meetingTimeIso,
      longitude: data.locationLng,
      latitude: data.locationLat,
      joinMode: data.joinMode,
      // locationText 등 UI 전용 필드는 서버가 안 받을 수도 있음 (확인 필요)
    });
    return res.data;
  },

  // 6. 수정
  async updateMeeting(id, data) {
    const res = await client.put<ServerPost>(endpoints.posts.byId(id), {
      category: data.category,
      title: data.title,
      content: data.content,
      meetingTime: data.meetingTimeIso,
      longitude: data.locationLng,
      latitude: data.locationLat,
      joinMode: data.joinMode,
      state: "OPEN", // 상태 변경 로직 필요시 추가
    });
    return res.data;
  },

  // 7. 삭제/취소
  async cancelMeeting(id) {
    await client.delete(endpoints.posts.byId(id));
    // 삭제 후 껍데기 반환
    return { post: { id, status: "CANCELED" } as any };
  },

  // 8. 참여하기
  async joinMeeting(id) {
    const res = await client.post<ServerApplicant>(endpoints.posts.applicants(id));
    // 서버 응답(Applicant)을 보고 상태 매핑
    const statusMap: Record<string, any> = {
      APPROVED: "MEMBER",
      PENDING: "PENDING",
      REJECTED: "REJECTED",
    };
    
    // UI 갱신을 위해 MeetingPost 정보가 필요하지만, 
    // API가 Applicant만 준다면 다시 getMeeting을 호출해야 할 수도 있음.
    // 여기서는 약식으로 처리
    const newStatus = statusMap[res.data.state] || "NONE";
    return { 
      post: { id, myState: { membershipStatus: newStatus } } as any, 
      membershipStatus: newStatus 
    };
  },

  // 9. 참여 취소 (명세서에 API 없음?!)
  async cancelJoin(id) {
    // ⚠️ 명세서에 '신청 취소(DELETE /posts/{id}/applicants)'가 안 보임.
    // 일단 에러 처리하거나 서버 개발자에게 문의.
    throw new Error("서버에 참여 취소 API가 없습니다.");
  },

  // 10. 참여자 목록
  async getParticipants(meetingId) {
    const res = await client.get<ServerApplicant[]>(endpoints.posts.applicants(meetingId));
    // ServerApplicant -> Participant 변환
    return res.data.map(a => ({
      userId: a.userId,
      nickname: a.userId, // 닉네임 정보가 없으면 ID로 대체
      status: a.state === "APPROVED" ? "MEMBER" : a.state,
      appliedAt: new Date().toISOString(), // 시간 정보 없으면 현재 시간
    }));
  },

  // 11. 승인
  async approveParticipant(meetingId, userId) {
    await client.patch(endpoints.posts.decideApplicant(meetingId, userId), "APPROVED");
    // 목록 다시 불러오기
    return this.getParticipants(meetingId);
  },

  // 12. 거절
  async rejectParticipant(meetingId, userId) {
    await client.patch(endpoints.posts.decideApplicant(meetingId, userId), "REJECTED");
    return this.getParticipants(meetingId);
  },
};