import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { withAlpha } from "@/shared/theme/colors";
import type { MeetingPost, MembershipStatus, PostStatus } from "@/features/meetings/model/types";
import { meetingTimeTextFromIso } from "@/shared/utils/timeText";

type Pill = { bg: string; fg: string };
type IconName = keyof typeof Ionicons.glyphMap;

// ✅ 최종 명세 카테고리("운동" | "오락" | "식사" | "자유") 기준 아이콘 매핑
const CATEGORY_ICONS: Record<string, IconName> = {
  운동: "basketball",
  오락: "game-controller",
  식사: "restaurant",
  자유: "apps",
  default: "apps",
};

function getCategoryIcon(category?: string): IconName {
  const key = typeof category === "string" ? category : "default";
  return CATEGORY_ICONS[key] ?? CATEGORY_ICONS.default;
}

function statusLabel(s: PostStatus) {
  switch (s) {
    case "FULL":
      return "정원마감";
    case "CANCELED":
      return "취소됨";
    case "ENDED":
      return "종료";
    case "STARTED":
      return "진행중";
    default:
      return null;
  }
}

type Props = {
  item: MeetingPost;
  showStatusPill?: boolean;
  showJoinBlockedBadge?: boolean;
  showHostMessage?: boolean;
};

export function MeetingCard({
  item,
  showStatusPill = true,
  showJoinBlockedBadge = true,
  showHostMessage = true,
}: Props) {
  const t = useAppTheme();
  const router = useRouter();

  const timeLabel = useMemo(() => {
    if (item.meetingTime) return meetingTimeTextFromIso(item.meetingTime);
    return item.meetingTimeText ?? "";
  }, [item.meetingTime, item.meetingTimeText]);

  const ms: MembershipStatus = item.myState?.membershipStatus ?? "NONE";
  const canJoin = item.myState?.canJoin ?? true;

  const isHost = ms === "HOST";
  const isMember = ms === "MEMBER";
  const isPending = ms === "PENDING";
  const isRejected = ms === "REJECTED";

  // ✅ MembershipStatus에는 "CANCELED"가 없으므로(불일치) 카드 취소 여부는 status만으로 판단
  const isCanceledPost = item.status === "CANCELED";

  const isCapacityFull = (() => {
    const total = item.capacity?.total ?? 0;
    const current = item.capacity?.current ?? 0;
    return total > 0 && current >= total;
  })();

  const effectiveStatus: PostStatus = item.status === "OPEN" && isCapacityFull ? "FULL" : item.status;

  const isJoinBlocked = effectiveStatus === "OPEN" && ms === "NONE" && canJoin === false && !isPending;

  const isDisabled =
    effectiveStatus === "ENDED" ||
    effectiveStatus === "CANCELED" ||
    (effectiveStatus === "FULL" && ms === "NONE") ||
    (effectiveStatus === "STARTED" && ms === "NONE") ||
    isJoinBlocked ||
    isRejected ||
    isCanceledPost;

  const pillTone = (hex: string, alpha = t.mode === "dark" ? 0.22 : 0.14): Pill => ({
    bg: withAlpha(hex, alpha),
    fg: hex,
  });

  const timePill: Pill = useMemo(() => {
    return isDisabled ? { bg: t.colors.overlay[8], fg: t.colors.textSub } : { bg: t.colors.overlay[6], fg: t.colors.textSub };
  }, [isDisabled, t.colors]);

  const statePill = useMemo(() => {
    if (!showStatusPill) return null;
    const label = statusLabel(effectiveStatus);
    if (!label) return null;

    switch (effectiveStatus) {
      case "FULL":
        return { label, icon: "people" as const, pill: pillTone(t.colors.warning) };
      case "CANCELED":
        return { label, icon: "close-circle" as const, pill: pillTone(t.colors.error) };
      case "ENDED":
        return { label, icon: "flag" as const, pill: { bg: t.colors.overlay[8], fg: t.colors.textSub } };
      case "STARTED":
        return { label, icon: "play-circle" as const, pill: pillTone(t.colors.primary) };
      default:
        return null;
    }
  }, [showStatusPill, effectiveStatus, t.colors, t.mode]);

  const leftBadge = useMemo(() => {
    if (isHost) return { label: "내 모임", tone: "primary" as const };
    if (isMember) return { label: "참여중", tone: "success" as const };
    if (isPending) return { label: "승인 대기", tone: "warning" as const };
    if (isRejected) return { label: "거절됨", tone: "error" as const };
    if (showJoinBlockedBadge && isJoinBlocked) return { label: "조건 미달", tone: "neutral" as const };
    return null;
  }, [isHost, isMember, isPending, isRejected, isJoinBlocked, showJoinBlockedBadge]);

  const joinModeMeta = useMemo(() => {
    const isInstant = item.joinMode === "INSTANT";
    const icon: IconName = isInstant ? "flash" : "shield-checkmark";
    const color = isInstant ? t.colors.point : t.colors.info;
    return { label: isInstant ? "선착순" : "승인제", icon, color };
  }, [item.joinMode, t.colors.point, t.colors.info]);

  const disabledStyle = useMemo(() => {
    if (!isDisabled) return null;
    if (effectiveStatus === "FULL") {
      return {
        bg: withAlpha(t.colors.warning, 0.04),
        border: withAlpha(t.colors.warning, 0.2),
        opacity: 0.9,
        title: withAlpha(t.colors.textMain, 0.6),
      };
    }
    return {
      bg: t.colors.overlay[6],
      border: t.colors.border,
      opacity: 0.75,
      title: t.colors.textSub,
    };
  }, [isDisabled, effectiveStatus, t.colors]);

  const titleColor = disabledStyle?.title ?? t.colors.textMain;

  const categoryIcon = getCategoryIcon(item.category);

  return (
    <Card
      onPress={() => router.push(`/meetings/${item.id}`)}
      style={[
        styles.card,
        {
          borderColor: disabledStyle?.border ?? t.colors.border,
          backgroundColor: disabledStyle?.bg ?? t.colors.surface,
          opacity: disabledStyle?.opacity ?? 1,
        },
      ]}
      padded
    >
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View
            style={[
              styles.catIconBox,
              { backgroundColor: isDisabled ? t.colors.overlay[6] : withAlpha(t.colors.primary, 0.1) },
            ]}
          >
            <Ionicons name={categoryIcon} size={14} color={isDisabled ? t.colors.icon.muted : t.colors.primary} />
          </View>

          <Text style={[t.typography.titleMedium, styles.titleText, { color: titleColor }]} numberOfLines={1}>
            {item.title}
          </Text>
        </View>

        <View style={[styles.timePill, { backgroundColor: timePill.bg }]}>
          <Text style={[t.typography.labelSmall, { color: timePill.fg, fontWeight: "600" }]}>{timeLabel}</Text>
        </View>
      </View>

      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={16} color={isDisabled ? t.colors.icon.muted : t.colors.icon.default} />
        <Text style={[t.typography.bodyMedium, { color: t.colors.textSub, flex: 1 }]} numberOfLines={1}>
          {item.location?.name || "장소 미정"}
          {item.distanceText ? <Text style={{ color: t.colors.primary }}>  {item.distanceText}</Text> : null}
        </Text>
      </View>

      <View style={styles.footerRow}>
        <View style={styles.badgeGroup}>
          {leftBadge ? <Badge label={leftBadge.label} tone={leftBadge.tone} size="md" /> : null}

          {statePill ? (
            <View style={[styles.pillBox, { backgroundColor: statePill.pill.bg }]}>
              <Ionicons name={statePill.icon} size={12} color={statePill.pill.fg} />
              <Text style={[t.typography.labelSmall, { color: statePill.pill.fg, fontWeight: "700" }]}>{statePill.label}</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.joinInfoBox, { backgroundColor: t.colors.background, borderColor: t.colors.border }]}>
          <View style={styles.rowCentered}>
            <Ionicons name={joinModeMeta.icon} size={12} color={joinModeMeta.color} />
            <Text style={[t.typography.labelSmall, { color: joinModeMeta.color, fontWeight: "700", marginLeft: 4 }]}>
              {joinModeMeta.label}
            </Text>
          </View>

          <View style={[styles.verticalLine, { backgroundColor: t.colors.border }]} />

          <View style={styles.rowCentered}>
            <Ionicons name="person" size={12} color={t.colors.textSub} />
            <Text style={[t.typography.labelSmall, { color: t.colors.textSub, marginLeft: 4 }]}>
              <Text style={{ color: isDisabled ? t.colors.textSub : t.colors.primary, fontWeight: "800" }}>
                {item.capacity?.current ?? 0}
              </Text>
              /{item.capacity?.total ?? 0}
            </Text>
          </View>
        </View>
      </View>

      {showHostMessage && item.content ? (
        <View style={[styles.memoRow, { borderTopColor: t.colors.divider }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={14} color={t.colors.textSub} style={{ marginTop: 2 }} />
          <Text style={[t.typography.bodySmall, { color: t.colors.textSub, flex: 1 }]} numberOfLines={1}>
            {item.content}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    elevation: 0,
    shadowOpacity: 0,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8,
  },
  titleGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  catIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  titleText: {
    flex: 1,
  },
  timePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 16,
  },

  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pillBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  joinInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
  },
  rowCentered: {
    flexDirection: "row",
    alignItems: "center",
  },
  verticalLine: {
    width: 1,
    height: 10,
    marginHorizontal: 8,
  },

  memoRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 6,
  },
});

/*
- MembershipStatus에 없던 "CANCELED" 비교/분기 제거(취소는 item.status로만 판단)
- 카테고리 아이콘 매핑을 최종 명세(운동/오락/식사/자유) 문자열 기준으로 통일
- joinInfoBox 테두리를 테마 토큰으로 맞춰 하드코딩 제거
*/