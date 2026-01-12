import React, { useMemo } from "react";
import { Text, View } from "react-native";

import { Screen } from "~/shared/layout/Screen";
import { useAppTheme } from "~/shared/hooks/useAppTheme";
import { Card } from "~/shared/ui/Card";
import { Badge } from "~/shared/ui/Badge";

import { useReviewsStore } from "~/features/reviews/store";
import { RatingStars } from "~/features/reviews/ui/RatingStars";
import { ReviewCard } from "~/features/reviews/ui/ReviewCard";

function summarize(reviews: { rating: number }[]) {
  if (reviews.length === 0) return { avgRating: 0, count: 0 };
  const sum = reviews.reduce((a, r) => a + r.rating, 0);
  const avg = sum / reviews.length;
  return { avgRating: Math.round(avg * 10) / 10, count: reviews.length };
}

export default function MyScreen() {
  const t = useAppTheme();

  // ✅ 원본만 가져오기
  const me = useReviewsStore((s) => s.me);
  const allReviews = useReviewsStore((s) => s.reviews);

  // ✅ 파생은 useMemo
  const myReviews = useMemo(() => {
    return allReviews
      .filter((r) => r.authorId === me.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allReviews, me.id]);

  const mySummary = useMemo(() => summarize(myReviews), [myReviews]);

  return (
    <Screen>
      <Text style={[t.typography.titleLarge, { color: t.colors.textMain }]}>{me.name}님</Text>
      <Text style={[t.typography.bodyMedium, { color: t.colors.textSub, marginTop: 6 }]}>
        내가 남긴 리뷰로 신뢰도를 쌓아보세요
      </Text>

      <View style={{ height: 12 }} />

      <Card>
        <Text style={[t.typography.titleMedium, { color: t.colors.textMain }]}>내 리뷰 요약</Text>
        <View style={{ height: 10 }} />

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ gap: 6 } as any}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 } as any}>
              <RatingStars value={mySummary.avgRating} readonly />
              <Text style={[t.typography.titleMedium, { color: t.colors.textMain }]}>
                {mySummary.avgRating.toFixed(1)}
              </Text>
            </View>
            <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>리뷰 {mySummary.count}개</Text>
          </View>

          <Badge label="1차 본" tone="primary" />
        </View>
      </Card>

      <View style={{ height: 12 }} />

      <Card>
        <Text style={[t.typography.titleMedium, { color: t.colors.textMain }]}>내가 남긴 리뷰</Text>
        <View style={{ height: 10 }} />

        {myReviews.length === 0 ? (
          <Text style={[t.typography.bodyMedium, { color: t.colors.textSub }]}>
            아직 내가 남긴 리뷰가 없어요. 모임에 참여하고 리뷰를 남겨보세요!
          </Text>
        ) : (
          <View style={{ gap: 10 } as any}>
            {myReviews.slice(0, 5).map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </View>
        )}
      </Card>
    </Screen>
  );
}
