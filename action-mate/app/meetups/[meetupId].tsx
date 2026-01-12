import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

import { Screen } from "~/shared/layout/Screen";
import { useAppTheme } from "~/shared/hooks/useAppTheme";
import { Card } from "~/shared/ui/Card";
import { Button } from "~/shared/ui/Button";
import { Badge } from "~/shared/ui/Badge";

import { useMeetupsStore } from "~/features/meetups/store";
import { useReviewsStore } from "~/features/reviews/store";
import { RatingStars } from "~/features/reviews/ui/RatingStars";
import { ReviewCard } from "~/features/reviews/ui/ReviewCard";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function timeLabelFromIso(iso: string) {
  const d = new Date(iso);
  const now = new Date();

  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const isTomorrow =
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate();

  const hhmm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

  if (sameDay) return `오늘 ${hhmm}`;
  if (isTomorrow) return `내일 ${hhmm}`;
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${hhmm}`;
}

function summarize(reviews: { rating: number }[]) {
  if (reviews.length === 0) return { avgRating: 0, count: 0 };
  const sum = reviews.reduce((a, r) => a + r.rating, 0);
  const avg = sum / reviews.length;
  return { avgRating: Math.round(avg * 10) / 10, count: reviews.length };
}

const CAT_STYLE: Record<
  string,
  { iconName: React.ComponentProps<typeof MaterialIcons>["name"]; colorHex: string }
> = {
  running: { iconName: "directions-run", colorHex: "#FF6B00" },
  walk: { iconName: "directions-walk", colorHex: "#00C853" },
  climb: { iconName: "terrain", colorHex: "#8D6E63" },
  gym: { iconName: "fitness-center", colorHex: "#7E57C2" },
  etc: { iconName: "sports-tennis", colorHex: "#1E88E5" },
};

export default function MeetupDetailScreen() {
  const t = useAppTheme();
  const { meetupId } = useLocalSearchParams<{ meetupId: string }>();
  const id = typeof meetupId === "string" ? meetupId : String(meetupId ?? "");

  const meetup = useMeetupsStore((s) => s.meetups.find((m) => m.id === id));
  const joinMeetup = useMeetupsStore((s) => s.joinMeetup);

  // ✅ reviews store: 원본만 가져오기
  const me = useReviewsStore((s) => s.me);
  const allReviews = useReviewsStore((s) => s.reviews);

  // ✅ 파생은 useMemo
  const reviews = useMemo(() => {
    return allReviews
      .filter((r) => r.meetupId === id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allReviews, id]);

  const summary = useMemo(() => summarize(reviews), [reviews]);

  const myReview = useMemo(() => {
    return reviews.find((r) => r.authorId === me.id) ?? null;
  }, [reviews, me.id]);

  // ✅ 내 리뷰 제외한 리스트(중복 표시 방지)
  const otherReviews = useMemo(() => {
    return reviews.filter((r) => r.authorId !== me.id);
  }, [reviews, me.id]);

  const view = useMemo(() => {
    if (!meetup) return null;
    const style = CAT_STYLE[meetup.category] ?? CAT_STYLE.etc;

    return {
      ...meetup,
      iconName: style.iconName,
      colorHex: style.colorHex,
      timeLabel: timeLabelFromIso(meetup.startsAt),
      locationLabel: meetup.placeName,
      current: meetup.joinedCount,
      max: meetup.capacity,
      joined: meetup.joinStatus === "joined",
    };
  }, [meetup]);

  if (!view) {
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
      {/* 헤더 */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}
        >
          <MaterialIcons name="arrow-back-ios-new" size={20} color={t.colors.textMain} />
        </Pressable>

        <Text style={[t.typography.titleMedium, { marginLeft: 6, color: t.colors.textMain }]}>
          모임 상세
        </Text>
      </View>

      {/* 메인 카드 */}
      <Card>
        <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: view.colorHex + "22",
              marginRight: 12,
              marginTop: 2,
            }}
          >
            <MaterialIcons name={view.iconName} size={24} color={view.colorHex} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[t.typography.titleLarge, { color: t.colors.textMain }]}>{view.title}</Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 } as any}>
              <Badge label={`#${view.category}`} tone="primary" />
              {view.joined ? <Badge label="참여중" tone="point" /> : <Badge label="미참여" />}
              {myReview ? <Badge label="내 리뷰 있음" tone="success" /> : null}
            </View>
          </View>
        </View>

        <View style={{ height: 12 }} />

        <Text style={[t.typography.bodyMedium, { color: t.colors.textSub }]}>⏰ {view.timeLabel}</Text>
        <Text style={[t.typography.bodyMedium, { color: t.colors.textSub, marginTop: 6 }]}>
          📍 {view.locationLabel}
        </Text>
        <Text style={[t.typography.bodyMedium, { color: t.colors.textSub, marginTop: 6 }]}>
          👥 {view.current}/{view.max}
        </Text>

        <View style={{ height: 14 }} />

        <View style={{ gap: 10 } as any}>
          <Button
            title={view.joined ? "참여중" : "참여하기"}
            variant={view.joined ? "secondary" : "primary"}
            disabled={view.joined}
            onPress={() => joinMeetup(view.id)}
          />

          <Button
            title={myReview ? "리뷰 수정하기" : "모임 완료하고 리뷰 남기기"}
            variant={myReview ? "secondary" : "primary"}
            disabled={!view.joined}
            onPress={() => router.push({ pathname: "/reviews/create", params: { meetupId: view.id } })}
          />
        </View>
      </Card>

      <View style={{ height: 12 }} />

      {/* 리뷰 카드 */}
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={[t.typography.titleMedium, { color: t.colors.textMain }]}>리뷰</Text>

          <Pressable
            onPress={() => router.push({ pathname: "/reviews/create", params: { meetupId: view.id } })}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 } as any}
          >
            <Text style={[t.typography.labelMedium, { color: t.colors.primary }]}>
              {myReview ? "리뷰 수정" : "리뷰 남기기"}
            </Text>
            <MaterialIcons name="chevron-right" size={20} color={t.colors.primary} />
          </Pressable>
        </View>

        <View style={{ height: 10 }} />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 } as any}>
          <RatingStars value={summary.avgRating} readonly />
          <Text style={[t.typography.bodyMedium, { color: t.colors.textMain }]}>
            {summary.avgRating.toFixed(1)}
          </Text>
          <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>({summary.count}개)</Text>
        </View>

        <View style={{ height: 12 }} />

        {/* ✅ 내 리뷰는 위에서 1번만 */}
        {myReview ? (
          <>
            <Text style={[t.typography.labelMedium, { color: t.colors.textSub, marginBottom: 8 }]}>
              내가 남긴 리뷰
            </Text>
            <ReviewCard review={myReview} />
            <View style={{ height: 12 }} />
          </>
        ) : null}

        {/* ✅ 아래 리스트에서는 내 리뷰 제외 */}
        {(myReview ? otherReviews.length === 0 : reviews.length === 0) ? (
          <Text style={[t.typography.bodyMedium, { color: t.colors.textSub }]}>
            아직 다른 리뷰가 없어요. 첫 리뷰를 남겨보세요!
          </Text>
        ) : (
          <View style={{ gap: 10 } as any}>
            {(myReview ? otherReviews : reviews).slice(0, 3).map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </View>
        )}
      </Card>

      <View style={{ height: 12 }} />

      {/* 설명 placeholder */}
      <Card>
        <Text style={[t.typography.titleMedium, { color: t.colors.textMain }]}>상세 설명(placeholder)</Text>
        <Text style={[t.typography.bodySmall, { color: t.colors.textSub, marginTop: 6 }]}>
          여기엔 모임 소개/준비물/공지/채팅 등이 들어갈 예정입니다.
        </Text>
      </Card>
    </Screen>
  );
}
