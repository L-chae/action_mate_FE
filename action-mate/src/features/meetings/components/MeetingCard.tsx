import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { MeetingPost } from "../types";

export default function MeetingCard({ item }: { item: MeetingPost }) {
  const t = useAppTheme();
  const router = useRouter();

  // ✅ 1. 내 상태 확인 (호스트인지, 멤버인지)
  const isHost = item.myState?.membershipStatus === "HOST";
  const isMember = item.myState?.membershipStatus === "MEMBER";

  const isClosed = ["FULL", "ENDED", "CANCELED"].includes(item.status);

  // ✅ 2. 비활성 스타일 조건
  const isDisabled =
    isClosed ||
    (!item.myState?.canJoin && !isHost && !isMember && item.status !== "STARTED");

  // ✅ 3. 뱃지 로직
  const badge = (() => {
    if (isHost) return <Badge label="내 모임" tone="primary" />;
    if (isMember) return <Badge label="참여중" tone="success" />;

    switch (item.status) {
      case "ENDED":
        return <Badge label="종료됨" tone="default" />;
      case "CANCELED":
        return <Badge label="취소됨" tone="default" />;
      case "STARTED":
        return <Badge label="진행중" tone="primary" />;
      case "FULL":
        return <Badge label="정원마감" tone="warning" />;
      default:
        if (!item.myState?.canJoin) return <Badge label="참여불가" tone="default" />;
        return <Badge label="모집중" tone="success" />;
    }
  })();

  // ✅ 핵심: Android에서 Card elevation이 sticky header 위로 올라와 터치를 막는 케이스 방지
  const androidLowerElevation =
    Platform.OS === "android" ? { elevation: 0, zIndex: 0 } : { zIndex: 0 };

  return (
    <Card
      onPress={() => router.push(`/meetings/${item.id}`)}
      style={[
        styles.card,
        androidLowerElevation,
        { borderColor: t.colors.neutral[200] },
        isDisabled && {
          backgroundColor: t.colors.neutral[100],
          opacity: 0.7,
          borderWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
      ]}
      padded
    >
      {/* 1. [헤더] 제목 & 시간 */}
      <View style={styles.headerRow}>
        <Text
          style={[
            t.typography.titleMedium,
            styles.title,
            isDisabled && { color: t.colors.textSub },
          ]}
          numberOfLines={1}
        >
          {item.title}
        </Text>

        <View
          style={[
            styles.timeBox,
            {
              backgroundColor: isDisabled ? "transparent" : t.colors.neutral[100],
              borderColor: t.colors.neutral[200],
            },
          ]}
        >
          <Text
            style={[
              t.typography.labelMedium,
              { color: isDisabled ? t.colors.textSub : t.colors.textMain },
            ]}
          >
            {item.meetingTimeText}
          </Text>
        </View>
      </View>

      {/* 2. [위치 그룹] 장소 · 거리 */}
      <View style={styles.locationRow}>
        <Ionicons name="map-outline" size={16} color={t.colors.neutral[400]} />
        <Text
          style={[t.typography.bodyMedium, { color: t.colors.textSub }]}
          numberOfLines={1}
        >
          {item.locationText}
        </Text>

        {item.distanceText ? (
          <>
            <Text
              style={[
                t.typography.bodySmall,
                { color: t.colors.neutral[300], marginHorizontal: 4 },
              ]}
            >
              |
            </Text>
            <Ionicons
              name="location-sharp"
              size={14}
              color={isDisabled ? t.colors.neutral[400] : t.colors.primary}
            />
            <Text
              style={[
                t.typography.labelSmall,
                { color: isDisabled ? t.colors.textSub : t.colors.primary },
              ]}
            >
              {item.distanceText}
            </Text>
          </>
        ) : null}
      </View>

      {/* 3. [참여 그룹] */}
      <View style={styles.statusRow}>
        <View>{badge}</View>

        <View
          style={[
            styles.joinInfoBox,
            { backgroundColor: isDisabled ? "transparent" : t.colors.neutral[50] },
          ]}
        >
          <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>
            {item.joinMode === "INSTANT" ? "⚡선착순" : "🙋승인제"}
          </Text>

          <View
            style={[
              styles.divider,
              { backgroundColor: t.colors.neutral[200] }, // ✅ 하드코딩 제거
            ]}
          />

          <Ionicons name="people" size={14} color={t.colors.textSub} />
          <Text
            style={[
              t.typography.labelMedium,
              { color: t.colors.textSub, marginLeft: 2 },
            ]}
          >
            <Text
              style={{
                color: isDisabled ? t.colors.textSub : t.colors.primary,
                fontWeight: "700",
              }}
            >
              {item.capacityJoined}
            </Text>
            /{item.capacityTotal}
          </Text>
        </View>
      </View>

      {/* 4. [옵션] 본문 */}
      {item.content ? (
        <View
          style={[
            styles.memoRow,
            {
              borderTopColor: isDisabled
                ? t.colors.neutral[200]
                : t.colors.neutral[100],
            },
          ]}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={14}
            color={t.colors.neutral[400]}
            style={{ marginTop: 2 }}
          />
          <Text
            style={[t.typography.bodySmall, { color: t.colors.neutral[600], flex: 1 }]}
            numberOfLines={1}
          >
            {item.content}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    // ✅ 카드가 헤더 터치를 막지 않도록 기본 스택 낮게(특히 Android에서 중요)
    zIndex: 0,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    flex: 1,
    marginRight: 10,
  },
  timeBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 14,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  joinInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  divider: {
    width: 1,
    height: 10,
    marginHorizontal: 8,
  },
  memoRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
  },
});