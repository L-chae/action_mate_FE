import React, { useMemo, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

import { Screen } from "~/shared/layout/Screen";
import { useAppTheme } from "~/shared/hooks/useAppTheme";
import { Card } from "~/shared/ui/Card";
import { Button } from "~/shared/ui/Button";

import { useMeetupsStore } from "~/features/meetups/store";
import { useReviewsStore } from "~/features/reviews/store";
import { RatingStars } from "~/features/reviews/ui/RatingStars";

export default function ReviewCreateScreen() {
  const t = useAppTheme();
  const { meetupId } = useLocalSearchParams<{ meetupId: string }>();
  const id = typeof meetupId === "string" ? meetupId : String(meetupId ?? "");

  const meetup = useMeetupsStore((s) => s.meetups.find((m) => m.id === id));

  // ✅ store에서 원본만 가져오기
  const me = useReviewsStore((s) => s.me);
  const allReviews = useReviewsStore((s) => s.reviews);
  const addOrUpdate = useReviewsStore((s) => s.addOrUpdateMyReview);

  // ✅ 파생은 useMemo
  const myReview = useMemo(() => {
    return allReviews.find((r) => r.meetupId === id && r.authorId === me.id) ?? null;
  }, [allReviews, id, me.id]);

  const [rating, setRating] = useState<number>(myReview?.rating ?? 5);
  const [text, setText] = useState<string>(myReview?.text ?? "");

  const inputStyle = useMemo(
    () =>
      ({
        borderWidth: t.spacing.borderWidth,
        borderColor: t.colors.border,
        backgroundColor: t.colors.surface,
        borderRadius: t.spacing.radiusMd,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: t.colors.textMain,
        minHeight: 90,
        textAlignVertical: "top",
      } as const),
    [t]
  );

  if (!meetup) {
    return (
      <Screen>
        <Text style={t.typography.titleLarge}>모임을 찾을 수 없어요</Text>
        <View style={{ height: 12 }} />
        <Button title="뒤로가기" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}
        >
          <MaterialIcons name="arrow-back-ios-new" size={20} color={t.colors.textMain} />
        </Pressable>

        <Text style={[t.typography.titleMedium, { marginLeft: 6, color: t.colors.textMain }]}>
          리뷰 {myReview ? "수정" : "작성"}
        </Text>
      </View>

      <Card>
        <Text style={[t.typography.titleMedium, { color: t.colors.textMain }]} numberOfLines={2}>
          {meetup.title}
        </Text>

        <View style={{ height: 12 }} />

        <Text style={[t.typography.labelMedium, { color: t.colors.textSub, marginBottom: 6 }]}>별점</Text>
        <RatingStars value={rating} onChange={setRating} />

        <View style={{ height: 14 }} />

        <Text style={[t.typography.labelMedium, { color: t.colors.textSub, marginBottom: 6 }]}>한 줄 후기</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="예) 분위기 좋고 부담 없이 참여했어요!"
          placeholderTextColor={t.colors.textSub}
          style={inputStyle}
          multiline
          maxLength={200}
        />

        <View style={{ height: 14 }} />

        <Button
          title={myReview ? "수정 완료" : "리뷰 등록"}
          onPress={() => {
            if (rating < 1 || rating > 5) {
              Alert.alert("별점을 선택해줘", "1~5점 중 선택해줘.");
              return;
            }
            addOrUpdate(id, rating, text);
            router.replace({ pathname: "/meetups/[meetupId]", params: { meetupId: id } });
          }}
        />
      </Card>
    </Screen>
  );
}
