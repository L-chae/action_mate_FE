// feature/home/types.ts

// ✅ Home에서 사용하는 카테고리 (ALL 포함)
export type HomeCategory = "ALL" | "SPORTS" | "GAMES" | "MEAL" | "STUDY" | "ETC";

// ✅ Home 정렬 옵션
export type HomeSort = "LATEST" | "NEAR" | "SOON";

// ✅ Home 화면 카드 모델 (홈 UI에 맞춘 가벼운 형태)
export type HomeMeetingCard = {
  id: string;

  category: HomeCategory;

  title: string;

  meetingTimeText: string; // 예: "오늘 19:00"
  distanceText: string; // 예: "0.7km"

  capacityJoined: number;
  capacityTotal: number;

  joinMode: "INSTANT" | "APPROVAL";
  status: "OPEN" | "FULL" | "CANCELED" | "ENDED";
};

// ✅ Home fetch 파라미터
export type FetchHomeMeetingsParams = {
  category: HomeCategory;
  sort: HomeSort;
};
