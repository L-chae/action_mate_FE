export type Review = {
  id: string;
  meetupId: string;
  authorId: string;     // 1차본: "me"
  authorName: string;   // 1차본: "민수"
  rating: number;       // 1~5
  text: string;
  createdAt: string;    // ISO
};

export type ReviewSummary = {
  avgRating: number;    // 0~5
  count: number;
};
