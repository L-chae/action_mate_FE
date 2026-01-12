import { create } from "zustand";
import type { Review } from "./types";
import { MOCK_REVIEWS } from "./mock";

const ME = { id: "me", name: "민수" } as const;

function clampRating(n: number) {
  if (!Number.isFinite(n)) return 5;
  return Math.max(1, Math.min(5, Math.round(n)));
}

type ReviewsState = {
  me: typeof ME;
  reviews: Review[];
  addOrUpdateMyReview: (meetupId: string, rating: number, text: string) => string; // reviewId
};

export const useReviewsStore = create<ReviewsState>((set, get) => ({
  me: ME,
  reviews: MOCK_REVIEWS,

  addOrUpdateMyReview: (meetupId, rating, text) => {
    const { reviews, me } = get();
    const nowIso = new Date().toISOString();

    const safeRating = clampRating(rating);
    const safeText = (text ?? "").trim().slice(0, 200);

    const existing = reviews.find((r) => r.meetupId === meetupId && r.authorId === me.id);

    if (existing) {
      const next = reviews.map((r) =>
        r.id === existing.id ? { ...r, rating: safeRating, text: safeText, createdAt: nowIso } : r
      );
      set({ reviews: next });
      return existing.id;
    }

    const id = `rev_${Date.now()}`;
    const newReview: Review = {
      id,
      meetupId,
      authorId: me.id,
      authorName: me.name,
      rating: safeRating,
      text: safeText,
      createdAt: nowIso,
    };

    set({ reviews: [newReview, ...reviews] });
    return id;
  },
}));
