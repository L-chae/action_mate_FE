// src/features/my/api/myApi.remote.ts
import { client } from "@/shared/api/apiClient";
import { endpoints } from "@/shared/api/endpoints";
import { useAuthStore } from "@/features/auth/model/authStore";

import type { Post, ServerProfile } from "@/shared/model/types";
import type { MyMeetingItem, MyProfile, MySummary } from "../model/types";
import { mapPostToMyMeetingItem, mapUserProfileResponseToMyProfile } from "../model/mappers";

type MaybeArray<T> = T | T[];

function ensureArray<T>(v: MaybeArray<T> | null | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function pickDefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

function getCurrentUserIdOrThrow(): string {
  const user = useAuthStore.getState().user;
  const id = user ? String((user as any).loginId ?? user.id) : "";
  if (!id) throw new Error("로그인이 필요합니다.");
  return id;
}

export const myApiRemote = {
  async getProfile(): Promise<MyProfile> {
    const userId = getCurrentUserIdOrThrow();
    const res = await client.get<ServerProfile>(endpoints.users.profile(userId));
    return mapUserProfileResponseToMyProfile(res.data);
  },

  async updateProfile(payload: MyProfile): Promise<MyProfile> {
    // ✅ OpenAPI에 프로필 수정 엔드포인트가 없음
    // - UI 즉시 반영은 AuthStore.updateProfile로 처리
    await useAuthStore.getState().updateProfile({
      nickname: payload.nickname,
      avatarUrl: payload.avatarUrl ?? null,
    });
    return payload;
  },

  async getSummary(): Promise<MySummary> {
    // ✅ UserProfile의 avgRate/orgTime을 그대로 사용
    const userId = getCurrentUserIdOrThrow();
    const res = await client.get<ServerProfile>(endpoints.users.profile(userId));
    return {
      avgRate: Number(res.data?.avgRate ?? 0) || 0,
      orgTime: Number(res.data?.orgTime ?? 0) || 0,
    };
  },

  async getHostedMeetings(): Promise<MyMeetingItem[]> {
    const myId = getCurrentUserIdOrThrow();

    const res = await client.get<Post[] | Post>(endpoints.posts.list);
    const posts = ensureArray(res.data);

    const hosted = posts.filter((p) => String(p.writerId) === myId || p.myParticipationStatus === "HOST");
    return hosted.map(mapPostToMyMeetingItem);
  },

  async getJoinedMeetings(): Promise<MyMeetingItem[]> {
    const res = await client.get<Post[] | Post>(endpoints.posts.list);
    const posts = ensureArray(res.data);

    const joined = posts.filter(
      (p) => p.myParticipationStatus === "MEMBER" || p.myParticipationStatus === "PENDING",
    );

    return joined
      .map(mapPostToMyMeetingItem)
      .sort((a, b) => {
        const scoreA = a.myJoinStatus === "PENDING" ? 0 : 1;
        const scoreB = b.myJoinStatus === "PENDING" ? 0 : 1;
        return scoreA - scoreB;
      });
  },

  async updateHostedMeeting(id: string, patch: Partial<MyMeetingItem>): Promise<MyMeetingItem> {
    // 서버가 locationName 변경 시 좌표를 요구할 수도 있으므로, 현재 Post를 먼저 읽어옵니다.
    const current = await client.get<Post>(endpoints.posts.byId(id));
    const cur = current.data;

    const nextTitle = patch.title ?? cur.title;
    const nextLocationName = patch.location?.name ?? cur.locationName;

    const body = pickDefined({
      title: nextTitle,
      locationName: nextLocationName,
      // 좌표가 유효하면 같이 보냄(서버 엄격 대비)
      latitude: Number.isFinite(cur.latitude) ? cur.latitude : undefined,
      longitude: Number.isFinite(cur.longitude) ? cur.longitude : undefined,
    });

    const res = await client.put<Post>(endpoints.posts.byId(id), body);
    return mapPostToMyMeetingItem(res.data);
  },

  async deleteHostedMeeting(id: string): Promise<void> {
    await client.delete(endpoints.posts.byId(id));
  },
};

export default myApiRemote;