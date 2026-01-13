import type { MeetingPost, CategoryKey, MembershipStatus, HostSummary } from "./types";

// ✅ Mock Hosts (다양한 호스트 프로필 생성)
const HOST_USERS: Record<string, HostSummary> = {
  "user1": {
    id: "u1",
    nickname: "민수",
    mannerTemp: 37.5,
    kudosCount: 12,
    intro: "운동 끝나고 맥주 한잔 좋아해요 🍺",
    avatarUrl: "https://i.pravatar.cc/150?u=u1" // 랜덤 아바타
  },
  "user2": {
    id: "u2",
    nickname: "보드게임마스터",
    mannerTemp: 42.0,
    kudosCount: 56,
    intro: "전략 게임 전문입니다. 초보 환영!",
    avatarUrl: "https://i.pravatar.cc/150?u=u2"
  },
  "user3": {
    id: "u3",
    nickname: "새벽러너",
    mannerTemp: 36.5,
    kudosCount: 3,
    intro: "매일 아침 6시 뜁니다.",
  },
  "user4": {
    id: "u4",
    nickname: "맛집탐방러",
    mannerTemp: 38.2,
    kudosCount: 20,
    intro: "맛없는 건 안 먹어요 🙅‍♂️",
    avatarUrl: "https://i.pravatar.cc/150?u=u4"
  }
};

// ✅ 1. Mock Data (host 정보 포함하여 업데이트)
let _MOCK_DATA: MeetingPost[] = [
  {
    id: "1",
    category: "SPORTS",
    title: "🏸 배드민턴 2게임만 (초보 환영)",
    meetingTimeText: "오늘 19:00",
    distanceText: "0.6km",
    locationText: "잠원지구 3주차장",
    capacityJoined: 2,
    capacityTotal: 4,
    joinMode: "INSTANT",
    status: "OPEN",
    hostMemo: "라켓 여분 있어요! 몸만 오세요.",
    myState: { membershipStatus: "NONE", canJoin: true },
    durationHours: 2,
    host: HOST_USERS["user1"], // ✅ 호스트 추가
  },
  {
    id: "2",
    category: "MEAL",
    title: "🍜 저녁 라멘 같이 먹어요",
    meetingTimeText: "오늘 20:30",
    distanceText: "1.2km",
    locationText: "홍대 멘야무사시",
    capacityJoined: 4,
    capacityTotal: 4,
    joinMode: "INSTANT",
    status: "FULL",
    myState: { membershipStatus: "NONE", canJoin: false, reason: "정원마감" },
    durationHours: 1.5,
    host: HOST_USERS["user4"], // ✅ 호스트 추가
  },
  {
    id: "3",
    category: "GAMES",
    title: "🎮 보드게임 가볍게 한 판",
    meetingTimeText: "내일 14:00",
    distanceText: "0.9km",
    locationText: "성수 앨리스카페",
    capacityJoined: 1,
    capacityTotal: 5,
    joinMode: "APPROVAL",
    status: "OPEN",
    hostMemo: "룰 몰라도 알려드려요 😉",
    myState: { membershipStatus: "NONE", canJoin: true },
    durationHours: 3,
    host: HOST_USERS["user2"], // ✅ 호스트 추가
  },
  {
    id: "4",
    category: "SPORTS",
    title: "🏃 한강 러닝 5km",
    meetingTimeText: "오늘 21:00",
    distanceText: "2.4km",
    locationText: "반포 나들목",
    capacityJoined: 3,
    capacityTotal: 6,
    joinMode: "INSTANT",
    status: "OPEN",
    myState: { membershipStatus: "NONE", canJoin: true },
    durationHours: 1,
    host: HOST_USERS["user3"], // ✅ 호스트 추가
  },
  {
    id: "5",
    category: "ETC",
    title: "📸 야간 산책 + 사진 찍기",
    meetingTimeText: "오늘 22:00",
    distanceText: "3.1km",
    locationText: "낙산공원 입구",
    capacityJoined: 2,
    capacityTotal: 5,
    joinMode: "APPROVAL",
    status: "OPEN",
    hostMemo: "카메라 기종 상관없어요 폰카 가능",
    myState: { membershipStatus: "NONE", canJoin: true },
    durationHours: 2,
    host: HOST_USERS["user1"], // ✅ 호스트 추가
  },
  {
    id: "6",
    category: "MEAL",
    title: "☕ 점심 커피 한 잔",
    meetingTimeText: "내일 12:30",
    distanceText: "0.1km",
    locationText: "스타벅스 강남R점",
    capacityJoined: 1,
    capacityTotal: 2,
    joinMode: "INSTANT",
    status: "OPEN",
    myState: { membershipStatus: "NONE", canJoin: true },
    durationHours: 1,
    host: HOST_USERS["user4"], // ✅ 호스트 추가
  },
  {
    id: "7",
    category: "STUDY",
    title: "📚 각자 할 일 하는 스터디",
    meetingTimeText: "주말 10:00",
    distanceText: "1.5km",
    locationText: "투썸플레이스 사당점",
    capacityJoined: 3,
    capacityTotal: 4,
    joinMode: "INSTANT",
    status: "OPEN",
    hostMemo: "3시간 정도 집중해요",
    myState: { membershipStatus: "NONE", canJoin: true },
    durationHours: 3,
    host: HOST_USERS["user3"], // ✅ 호스트 추가
  },
  {
    id: "8",
    category: "GAMES",
    title: "♟️ 체스 두실 분",
    meetingTimeText: "내일 18:00",
    distanceText: "2.0km",
    locationText: "이디야 커피",
    capacityJoined: 2,
    capacityTotal: 2,
    joinMode: "INSTANT",
    status: "ENDED",
    myState: { membershipStatus: "NONE", canJoin: false, reason: "종료됨" },
    durationHours: 2,
    host: HOST_USERS["user2"], // ✅ 호스트 추가
  }
];

// --- Helper: 네트워크 지연 시뮬레이션 ---
const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

// ✅ 2. 목록 조회 (홈 화면)
export async function listMeetings(params: {
  category: CategoryKey | "ALL";
}): Promise<MeetingPost[]> {
  await delay();
  if (params.category === "ALL") {
    return [..._MOCK_DATA];
  }
  return _MOCK_DATA.filter((m) => m.category === params.category);
}

// ✅ 3. 상세 조회 (상세 화면)
export async function getMeeting(id: string): Promise<MeetingPost> {
  await delay();
  const found = _MOCK_DATA.find((m) => m.id === id);
  if (!found) throw new Error("Meeting not found");
  return { ...found }; // 복사본 반환
}

// ✅ 4. 참여 요청 (상세 화면 - 버튼)
export async function joinMeeting(id: string): Promise<{ post: MeetingPost; membershipStatus: MembershipStatus }> {
  await delay();
  const index = _MOCK_DATA.findIndex((m) => m.id === id);
  if (index === -1) throw new Error("Not found");

  const target = _MOCK_DATA[index];
  
  // 로직 시뮬레이션: 승인제면 PENDING, 선착순이면 JOINED
  const newStatus: MembershipStatus = target.joinMode === "APPROVAL" ? "PENDING" : "JOINED";
  
  // 인원 증가 (JOINED일 때만)
  let newJoinedCount = target.capacityJoined;
  if (newStatus === "JOINED") {
    newJoinedCount = Math.min(target.capacityJoined + 1, target.capacityTotal);
  }

  // 데이터 업데이트
  _MOCK_DATA[index] = {
    ...target,
    capacityJoined: newJoinedCount,
    // 만약 꽉 찼으면 상태 FULL로 변경
    status: newJoinedCount >= target.capacityTotal ? "FULL" : target.status,
    myState: {
      membershipStatus: newStatus,
      canJoin: false, // 이미 참여했으니 false
      reason: newStatus === "PENDING" ? "승인 대기중" : "참여 완료",
    },
  };

  return { post: _MOCK_DATA[index], membershipStatus: newStatus };
}

// ✅ 5. 참여/신청 취소 (상세 화면 - 버튼)
export async function cancelJoin(id: string): Promise<{ post: MeetingPost }> {
  await delay();
  const index = _MOCK_DATA.findIndex((m) => m.id === id);
  if (index === -1) throw new Error("Not found");

  const target = _MOCK_DATA[index];
  const oldStatus = target.myState?.membershipStatus;

  // 인원 감소 (JOINED 였을 때만)
  let newJoinedCount = target.capacityJoined;
  if (oldStatus === "JOINED") {
    newJoinedCount = Math.max(0, target.capacityJoined - 1);
  }

  _MOCK_DATA[index] = {
    ...target,
    capacityJoined: newJoinedCount,
    status: "OPEN", // 취소해서 자리가 났으므로 다시 OPEN (간단 로직)
    myState: {
      membershipStatus: "NONE",
      canJoin: true,
    },
  };

  return { post: _MOCK_DATA[index] };
}

// ✅ 6. 호스트 메모 수정 (상세 화면 - 호스트 모드)
export async function updateHostMemo(id: string, text: string): Promise<{ post: MeetingPost }> {
  await delay();
  const index = _MOCK_DATA.findIndex((m) => m.id === id);
  if (index === -1) throw new Error("Not found");

  _MOCK_DATA[index] = {
    ..._MOCK_DATA[index],
    hostMemo: text,
    memoUpdatedAtText: "방금 전",
  };

  return { post: _MOCK_DATA[index] };
}

// ✅ 7. 모임 취소 (상세 화면 - 호스트 모드)
export async function cancelMeeting(id: string): Promise<{ post: MeetingPost }> {
  await delay();
  const index = _MOCK_DATA.findIndex((m) => m.id === id);
  if (index === -1) throw new Error("Not found");

  _MOCK_DATA[index] = {
    ..._MOCK_DATA[index],
    status: "CANCELED",
    myState: {
      membershipStatus: "CANCELED",
      canJoin: false,
      reason: "모임 취소됨",
    },
  };

  return { post: _MOCK_DATA[index] };
}