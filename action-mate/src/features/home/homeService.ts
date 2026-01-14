export type HomeCategory = "ALL" | "SPORTS" | "GAMES" | "MEAL" | "ETC";
export type HomeSort = "LATEST" | "NEAR" | "SOON";

export type HomeMeetingCard = {
  id: string;
  category: HomeCategory;
  title: string;
  meetingTimeText: string; // "오늘 19:00"
  distanceText: string; // "0.7km"
  capacityJoined: number;
  capacityTotal: number;
  joinMode: "INSTANT" | "APPROVAL";
  status: "OPEN" | "FULL" | "CANCELED" | "ENDED";
};

export async function fetchHomeMeetings(params: {
  category: HomeCategory;
  sort: HomeSort;
}): Promise<HomeMeetingCard[]> {
  // ✅ 초기단계: 서버 붙기 전까지 목데이터로 UI/스타일 확인
  const mock: HomeMeetingCard[] = [
    {
      id: "1",
      category: "SPORTS",
      title: "🏸 배드민턴 2게임만",
      meetingTimeText: "오늘 19:00",
      distanceText: "0.6km",
      capacityJoined: 2,
      capacityTotal: 4,
      joinMode: "INSTANT",
      status: "OPEN",
    },
    {
      id: "2",
      category: "MEAL",
      title: "🍜 저녁 라멘 같이 먹어요",
      meetingTimeText: "오늘 20:30",
      distanceText: "1.2km",
      capacityJoined: 4,
      capacityTotal: 4,
      joinMode: "INSTANT",
      status: "FULL",
    },
    {
      id: "3",
      category: "GAMES",
      title: "🎮 보드게임 가볍게",
      meetingTimeText: "내일 14:00",
      distanceText: "0.9km",
      capacityJoined: 1,
      capacityTotal: 5,
      joinMode: "APPROVAL",
      status: "OPEN",
    },
  ];

  // 아주 간단한 필터만 적용
  const filtered =
    params.category === "ALL"
      ? mock
      : mock.filter((m) => m.category === params.category);

  return filtered;
}
