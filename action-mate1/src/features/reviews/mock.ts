import type { Review } from "./types";

function isoMinutesAgo(min: number) {
  return new Date(Date.now() - min * 60_000).toISOString();
}

export const MOCK_REVIEWS: Review[] = [
  {
    id: "r1",
    meetupId: "m1",
    authorId: "u1",
    authorName: "지훈",
    rating: 5,
    text: "페이스 딱 좋아요. 다음에도 또!",
    createdAt: isoMinutesAgo(1200),
  },
  {
    id: "r2",
    meetupId: "m1",
    authorId: "u2",
    authorName: "서연",
    rating: 4,
    text: "처음인데 부담 없었어요.",
    createdAt: isoMinutesAgo(800),
  },
  {
    id: "r3",
    meetupId: "m3",
    authorId: "u3",
    authorName: "현우",
    rating: 5,
    text: "초보 친절! 재밌었습니다.",
    createdAt: isoMinutesAgo(500),
  },
  {
    id: "r4",
    meetupId: "m2",
    authorId: "u4",
    authorName: "나래",
    rating: 4,
    text: "점심 산책 최고… 기분전환!",
    createdAt: isoMinutesAgo(200),
  },
];
