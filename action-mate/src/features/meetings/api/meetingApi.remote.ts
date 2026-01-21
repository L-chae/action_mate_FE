// src/features/meetings/api/meetingApi.remote.ts
import { client } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/api/endpoints";

import type {
  MeetingApi,
  SubmitMeetingRatingReq,
  SubmitMeetingRatingRes,
} from "./meetingApi";

import type {
  MeetingPost,
  HotMeetingItem,
  Participant,
  HomeSort,
  CategoryKey,
  AroundMeetingsOptions,
  MembershipStatus,
  MeetingParams,
} from "../model/types";

// ✅ 서버 응답 타입 정의 (DTO)
// 필요하다면 types.ts로 옮겨도 되지만, 여기서만 쓰이면 여기에 둬도 됨
type ServerPost = MeetingPost; // 현재는 구조가 거의 같다고 가정

type ServerApplicant = {
  postId: number;
  userId: string;
  state: "APPROVED" | "REJECTED" | "PENDING";
};

function mapApplicantStateToParticipantStatus(
  state: ServerApplicant["state"]
): Participant["status"] {
  if (state === "APPROVED") return "MEMBER";
  if (state === "PENDING") return "PENDING";
  return "REJECTED";
}

function mapApplicantStateToMembershipStatus(
  state: ServerApplicant["state"]
): MembershipStatus {
  if (state === "APPROVED") return "MEMBER";
  if (state === "PENDING") return "PENDING";
  return "REJECTED";
}

export const meetingApiRemote: MeetingApi = {
  // 1. 핫한 모임
  async listHotMeetings({ limit = 6 } = {}) {
    // ⚠️ TODO: 서버에 /posts/hot 같은 API가 없으면 Hot은 프론트에서 가공
    const res = await client.get<ServerPost[]>(endpoints.posts.create); // GET /posts

    return res.data.slice(0, limit).map(
      (m): HotMeetingItem => ({
        id: `hot-${m.id}`,
        meetingId: String(m.id),
        badge: "마감임박",
        title: m.title,
        place: m.locationText || "위치 미정",
        capacityJoined: m.capacityJoined,
        capacityTotal: m.capacityTotal,
      })
    );
  },

  // 2. 모임 목록 (카테고리 + 정렬)
  async listMeetings({ category = "ALL", sort = "LATEST" } = {}) {
    // 현재 서버 명세에 sort 파라미터가 없어서 프론트 정렬을 권장
    // 그래도 인터페이스 맞추려고 sort는 받되 여기서는 그대로 반환
    const _sort: HomeSort = sort;

    if (category === "ALL") {
      // ⚠️ 전체 조회가 없다면 임시로 "자유" 카테고리 호출
      // (정책 확정되면 서버에 전체조회 추가 or 카테고리 전체 병합)
      const res = await client.get<ServerPost[]>(endpoints.posts.byCategory("자유"));
      return res.data;
    }

    const res = await client.get<ServerPost[]>(endpoints.posts.byCategory(category as CategoryKey));
    return res.data;
  },

  // 3. 주변 모임
  async listMeetingsAround(lat, lng, opts: AroundMeetingsOptions = {}) {
    const { radiusKm = 1 } = opts;

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
  async createMeeting(data: MeetingParams) {
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
  async updateMeeting(id: string, data: MeetingParams) {
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
  async cancelMeeting(id: string) {
    await client.delete(endpoints.posts.byId(id));
    return { post: { id, status: "CANCELED" } as any };
  },

  // 8. 참여하기
  async joinMeeting(id: string) {
    const res = await client.post<ServerApplicant>(endpoints.posts.applicants(id));

    const membershipStatus = mapApplicantStateToMembershipStatus(res.data.state);

    // Applicant만 내려오면 post 정보가 없어서 최소 껍데기만 반환
    return {
      post: { id, myState: { membershipStatus, canJoin: false } } as any,
      membershipStatus,
    };
  },

  // 9. 참여 취소
  async cancelJoin(_id: string) {
    // ⚠️ 서버에 참여 취소 API가 없다면 스펙 확정 필요
    throw new Error("서버에 참여 취소 API가 없습니다.");
  },

  // 10. 참여자 목록
  async getParticipants(meetingId: string) {
    const res = await client.get<ServerApplicant[]>(endpoints.posts.applicants(meetingId));

    return res.data.map(
      (a): Participant => ({
        userId: a.userId,
        nickname: a.userId, // 닉네임 필드가 없으면 임시로 userId 사용
        status: mapApplicantStateToParticipantStatus(a.state),
        appliedAt: new Date().toISOString(),
      })
    );
  },

  // 11. 승인
  async approveParticipant(meetingId: string, userId: string) {
    // 서버가 body로 "APPROVED" 문자열 받는 형태라면 그대로
    await client.patch(endpoints.posts.decideApplicant(meetingId, userId), "APPROVED");
    // this 바인딩 이슈 방지
    return meetingApiRemote.getParticipants(meetingId);
  },

  // 12. 거절
  async rejectParticipant(meetingId: string, userId: string) {
    await client.patch(endpoints.posts.decideApplicant(meetingId, userId), "REJECTED");
    return meetingApiRemote.getParticipants(meetingId);
  },

  // ✅ 13. 모임 평가(별점 0~5)
  async submitMeetingRating(req: SubmitMeetingRatingReq): Promise<SubmitMeetingRatingRes> {
    const meetingId = String(req.meetingId);
    const stars = Number(req.stars);

    const res = await client.post<SubmitMeetingRatingRes>(
      endpoints.posts.ratings(meetingId),
      { stars }
    );

    return res.data;
  },
};
