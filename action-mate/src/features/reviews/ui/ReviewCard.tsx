import React from "react";
import { Text, View } from "react-native";
import { Card } from "~/shared/ui/Card";
import { useAppTheme } from "~/shared/hooks/useAppTheme";
import type { Review } from "../types";
import { RatingStars } from "./RatingStars";

function formatAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.max(1, Math.round(diff / 60000));
  if (min < 60) return `${min}분 전`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.round(h / 24);
  return `${d}일 전`;
}

export function ReviewCard({ review }: { review: Review }) {
  const t = useAppTheme();

  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={[t.typography.titleSmall, { color: t.colors.textMain }]}>{review.authorName}</Text>
        <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>{formatAgo(review.createdAt)}</Text>
      </View>

      <View style={{ height: 6 }} />
      <RatingStars value={review.rating} readonly />

      {review.text ? (
        <>
          <View style={{ height: 8 }} />
          <Text style={[t.typography.bodyMedium, { color: t.colors.textMain }]}>{review.text}</Text>
        </>
      ) : null}
    </Card>
  );
}
