// src/features/meetings/ui/MeetingCard.tsx

import React, { useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { withAlpha } from "@/shared/theme/colors";
import type { CategoryKey, MeetingPost, MembershipStatus, PostStatus } from "@/features/meetings/model/types";
import { meetingTimeTextFromIso } from "@/shared/utils/timeText";

type Pill = { bg: string; fg: string };
type IconName = keyof typeof Ionicons.glyphMap;

// 카테고리별 아이콘 매핑 (CategoryChips와 통일)
const CATEGORY_ICONS: Record<CategoryKey | string, IconName> = {
  SPORTS: "basketball",
  GAMES: "game-controller",
  MEAL: "restaurant",
  STUDY: "book",
  ETC: "ellipsis-horizontal-circle",
  default: "apps",
};

function getCategoryIcon(cat?: CategoryKey): IconName {
  return CATEGORY_ICONS[cat as string] ?? CATEGORY_ICONS.default;
}

function statusLabel(s: PostStatus) {
  switch (s) {
    case "FULL": return "정원마감";
    case "CANCELED": return "취소됨";
    case "ENDED": return "종료";
    case "STARTED": return "진행중";
    default: return null;
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

  // ────────────────────────────────────────────────────────────────────────
  // Logic
  // ────────────────────────────────────────────────────────────────────────

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
  const isMyCanceled = ms === "CANCELED";

  // 용량 초과 체크
  const isCapacityFull = (() => {
    const total = item.capacity?.total ?? 0;
    const current = item.capacity?.current ?? 0;
    return total > 0 && current >= total;
  })();

  const effectiveStatus: PostStatus = item.status === "OPEN" && isCapacityFull ? "FULL" : item.status;

  // 조건 불충족 (홈 리스트에서 비활성 처리용)
  const isJoinBlocked =
    effectiveStatus === "OPEN" &&
    ms === "NONE" &&
    canJoin === false &&
    !isPending;

  // 카드 비활성 스타일 적용 여부
  const isDisabled =
    effectiveStatus === "ENDED" ||
    effectiveStatus === "CANCELED" ||
    (effectiveStatus === "FULL" && ms === "NONE") ||
    (effectiveStatus === "STARTED" && ms === "NONE") ||
    isJoinBlocked ||
    isRejected ||
    isMyCanceled;

  // ────────────────────────────────────────────────────────────────────────
  // Styles / Colors
  // ────────────────────────────────────────────────────────────────────────

  const pillTone = (hex: string, alpha = t.mode === "dark" ? 0.22 : 0.14): Pill => ({
    bg: withAlpha(hex, alpha),
    fg: hex,
  });

  // 시간 뱃지 스타일
  const timePill: Pill = useMemo(() => {
    return isDisabled
      ? { bg: t.colors.overlay[8], fg: t.colors.textSub }
      : { bg: t.colors.overlay[6], fg: t.colors.textSub };
  }, [isDisabled, t.colors]);

  // 상태 뱃지 (진행중, 마감 등)
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

  // 좌측 상태 텍스트 (참여중, 승인대기 등)
  const leftBadge = useMemo(() => {
    if (isHost) return { label: "내 모임", tone: "primary" as const };
    if (isMember) return { label: "참여중", tone: "success" as const };
    if (isPending) return { label: "승인 대기", tone: "warning" as const };
    if (isRejected) return { label: "거절됨", tone: "error" as const };
    if (isMyCanceled) return { label: "취소함", tone: "neutral" as const };
    if (showJoinBlockedBadge && isJoinBlocked) return { label: "조건 미달", tone: "neutral" as const };
    return null;
  }, [isHost, isMember, isPending, isRejected, isMyCanceled, isJoinBlocked, showJoinBlockedBadge]);

  // 참여 방식 (선착순/승인제)
  const joinModeMeta = useMemo(() => {
    const isInstant = item.joinMode === "INSTANT";
    const icon: IconName = isInstant ? "flash" : "shield-checkmark";
    const color = isInstant ? t.colors.point : t.colors.info;
    return { label: isInstant ? "선착순" : "승인제", icon, color };
  }, [item.joinMode, t.colors.point, t.colors.info]);

  // 비활성 시 카드 전체 스타일 override
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
  const iconMuted = t.colors.icon.muted;
  const iconDefault = t.colors.icon.default;
  
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
      {/* ─────────────────────────────────────────────────────────────────
          1. Header: [Category Icon] [Title] [Time Pill]
      ────────────────────────────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          {/* 카테고리 아이콘 */}
          <View style={[
              styles.catIconBox, 
              { backgroundColor: isDisabled ? t.colors.overlay[6] : withAlpha(t.colors.primary, 0.1) }
            ]}>
            <Ionicons 
              name={categoryIcon} 
              size={14} 
              color={isDisabled ? t.colors.icon.muted : t.colors.primary} 
            />
          </View>
          
          {/* 제목 */}
          <Text style={[t.typography.titleMedium, styles.titleText, { color: titleColor }]} numberOfLines={1}>
            {item.title}
          </Text>
        </View>

        {/* 시간 */}
        <View style={[styles.timePill, { backgroundColor: timePill.bg }]}>
          <Text style={[t.typography.labelSmall, { color: timePill.fg, fontWeight: '600' }]}>
            {timeLabel}
          </Text>
        </View>
      </View>

      {/* ─────────────────────────────────────────────────────────────────
          2. Location Row
      ────────────────────────────────────────────────────────────────── */}
      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={16} color={isDisabled ? iconMuted : iconDefault} />
        <Text style={[t.typography.bodyMedium, { color: t.colors.textSub, flex: 1 }]} numberOfLines={1}>
          {item.location?.name || "장소 미정"}
          {item.distanceText && (
            <Text style={{ color: t.colors.primary }}>  {item.distanceText}</Text>
          )}
        </Text>
      </View>

      {/* ─────────────────────────────────────────────────────────────────
          3. Status Row: [Badges] <Space> [Join Info]
      ────────────────────────────────────────────────────────────────── */}
      <View style={styles.footerRow}>
        {/* 왼쪽: 상태 뱃지들 */}
        <View style={styles.badgeGroup}>
          {leftBadge && <Badge label={leftBadge.label} tone={leftBadge.tone} size="md" />}
          
          {statePill && (
            <View style={[styles.pillBox, { backgroundColor: statePill.pill.bg }]}>
              <Ionicons name={statePill.icon} size={12} color={statePill.pill.fg} />
              <Text style={[t.typography.labelSmall, { color: statePill.pill.fg, fontWeight: "700" }]}>
                {statePill.label}
              </Text>
            </View>
          )}
        </View>

        {/* 오른쪽: 참여 인원 & 방식 */}
        <View style={[styles.joinInfoBox, { backgroundColor: t.colors.background }]}>
          {/* 방식 (선착순/승인제) */}
          <View style={styles.rowCentered}>
            <Ionicons name={joinModeMeta.icon} size={12} color={joinModeMeta.color} />
            <Text style={[t.typography.labelSmall, { color: joinModeMeta.color, fontWeight: "700", marginLeft: 4 }]}>
              {joinModeMeta.label}
            </Text>
          </View>

          <View style={[styles.verticalLine, { backgroundColor: t.colors.border }]} />

          {/* 인원 */}
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

      {/* ─────────────────────────────────────────────────────────────────
          4. Host Message (Optional)
      ────────────────────────────────────────────────────────────────── */}
      {showHostMessage && item.content ? (
        <View style={[styles.memoRow, { borderTopColor: t.colors.divider }]}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={14}
            color={t.colors.textSub}
            style={{ marginTop: 2 }}
          />
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
    // Android Shadow 제거 (Flat 디자인)
    elevation: 0,
    shadowOpacity: 0,
  },
  
  // Header
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    flex: 1,
  },
  timePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },

  // Location
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 16, // 간격 살짝 넓힘
  },

  // Footer
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
  
  // Join Info Box
  joinInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)', // 아주 연한 테두리
  },
  rowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verticalLine: {
    width: 1,
    height: 10,
    marginHorizontal: 8,
  },

  // Memo
  memoRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 6,
  },
});