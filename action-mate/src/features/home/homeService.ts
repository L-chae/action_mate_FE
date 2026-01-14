import type { HomeCategory, HomeMeetingCard, HomeSort } from "./homeTypes";

const MOCK: HomeMeetingCard[] = [
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

// 아주 단순 파서(목데이터용): "0.6km" -> 0.6
function parseKm(distanceText: string) {
  const n = Number(distanceText.replace("km", "").trim());
  return Number.isFinite(n) ? n : 999;
}

// 아주 단순 파서(목데이터용): "오늘 19:00", "내일 14:00" 정렬용
function parseSoonRank(meetingTimeText: string) {
  // 목데이터라 엄청 정교할 필요 없음: 오늘 < 내일 < 그 외
  if (meetingTimeText.startsWith("오늘")) return 0;
  if (meetingTimeText.startsWith("내일")) return 1;
  return 2;
}

export async function fetchHomeMeetings(params: {
  category: HomeCategory;
  sort: HomeSort;
}): Promise<HomeMeetingCard[]> {
  // ✅ 1) category 필터
  const filtered =
    params.category === "ALL"
      ? MOCK
      : MOCK.filter((m) => m.category === params.category);

  // ✅ 2) sort 적용 (목데이터 기준)
  const sorted = [...filtered].sort((a, b) => {
    if (params.sort === "NEAR") return parseKm(a.distanceText) - parseKm(b.distanceText);
    if (params.sort === "SOON") return parseSoonRank(a.meetingTimeText) - parseSoonRank(b.meetingTimeText);
    // LATEST: id 역순(임시)
    return Number(b.id) - Number(a.id);
  });

  return sorted;
}
