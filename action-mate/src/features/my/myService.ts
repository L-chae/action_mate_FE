import type { MyMeetingItem, MyProfile, MySummary } from "./types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * 칭찬 수 -> 온도 계산 규칙
 * - 기본 36.5℃
 * - 칭찬 1개당 +0.12℃
 * - 32~42로 클램프
 */
export function calcTemperatureFromPraise(praiseCount: number) {
  const base = 36.5;
  const t = base + praiseCount * 0.12;
  return clamp(Number(t.toFixed(1)), 32, 42);
}

// ----------------------
// ✅ 로컬 목업 DB (앱 실행 중 메모리에 유지)
// ----------------------
let mockProfile: MyProfile = {
  nickname: "액션메이트",
  photoUrl: undefined,
};

let mockPraiseCount = 17;

let mockHosted: MyMeetingItem[] = [
  {
    id: "host-1",
    title: "러닝 5km 같이 뛰어요",
    place: "한강공원",
    dateText: "1/18(일) 10:00",
    memberCount: 8,
  },
  {
    id: "host-2",
    title: "클라이밍 초보 환영",
    place: "강남 클라임짐",
    dateText: "1/22(목) 19:30",
    memberCount: 12,
  },
];

let mockJoined: MyMeetingItem[] = [
  {
    id: "join-1",
    title: "보드게임 번개",
    place: "홍대",
    dateText: "1/16(금) 20:00",
    memberCount: 6,
  },
];

// (선택) 네트워크 느낌만 내고 싶으면 지연을 조금 줘도 됨
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function findHostedOrThrow(id: string) {
  const idx = mockHosted.findIndex((m) => m.id === id);
  if (idx < 0) throw new Error("해당 모임을 찾을 수 없어요.");
  return idx;
}

export const myService = {
  // ----------------------
  // Profile
  // ----------------------
  async getMyProfile(): Promise<MyProfile> {
    // await sleep(150);
    return mockProfile;
  },

  async updateMyProfile(payload: MyProfile): Promise<MyProfile> {
    // await sleep(150);
    mockProfile = {
      nickname: payload.nickname,
      photoUrl: payload.photoUrl,
    };
    return mockProfile;
  },

  // ----------------------
  // Summary (praise -> temperature)
  // ----------------------
  async getMySummary(): Promise<MySummary> {
    // await sleep(150);
    return {
      praiseCount: mockPraiseCount,
      temperature: calcTemperatureFromPraise(mockPraiseCount),
    };
  },

  // ----------------------
  // Meetings (Hosted/Joined)
  // ----------------------
  async getMyHostedMeetings(): Promise<MyMeetingItem[]> {
    // await sleep(150);
    return mockHosted;
  },

  async getMyJoinedMeetings(): Promise<MyMeetingItem[]> {
    // await sleep(150);
    return mockJoined;
  },

  /**
   * ✅ 내가 만든 모임 정보 수정 (시간/장소/제목/인원 등)
   * MeetingList의 "수정" 버튼 → 모달에서 저장할 때 사용
   */
  async updateMyHostedMeeting(
    id: string,
    patch: Partial<MyMeetingItem>
  ): Promise<MyMeetingItem> {
    // await sleep(150);

    const idx = findHostedOrThrow(id);

    // id는 변경 못하게 방어
    const { id: _ignore, ...safePatch } = patch;

    mockHosted[idx] = { ...mockHosted[idx], ...safePatch };
    return mockHosted[idx];
  },

  /**
   * (선택) 내가 만든 모임 삭제
   */
  async deleteMyHostedMeeting(id: string): Promise<void> {
    // await sleep(150);
    findHostedOrThrow(id);
    mockHosted = mockHosted.filter((m) => m.id !== id);
  },

  // ----------------------
  // Praise (temperature changes)
  // ----------------------
  /**
   * (선택) 테스트용: 칭찬 올리고/내려서 온도 변화 확인
   */
  async addPraise(count: number = 1): Promise<MySummary> {
    // await sleep(150);
    mockPraiseCount = Math.max(0, mockPraiseCount + count);
    return this.getMySummary();
  },

  // /**
  //  * (선택) 칭찬 값을 직접 세팅(디버그용)
  //  */
  // async setPraise(praiseCount: number): Promise<MySummary> {
  //   mockPraiseCount = Math.max(0, Math.floor(praiseCount));
  //   return this.getMySummary();
  // },
};