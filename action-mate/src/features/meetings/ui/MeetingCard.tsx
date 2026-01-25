import React, { useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
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

function statusLabel(s: PostStatus) {
  switch (s) {
    case "FULL":
      return "정원마감";
    case "CANCELED":
      return "취소됨";
    case "ENDED":
      return "끝남";
    case "STARTED":
      return "진행중";
    default:
      return null;
  }
}

type Props = {
  item: MeetingPost;

  /** 홈에서는 false: 진행중/정원마감/취소됨 같은 상태칩 숨김 */
  showStatusPill?: boolean;

  /** 홈에서는 false: “조건 불충족/참여불가” 텍스트 뱃지 숨김(카드만 비활성) */
  showJoinBlockedBadge?: boolean;

  /** 홈에서는 false: "호스트의 한마디(content)" 숨김 */
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
  const isMyCanceled = ms === "CANCELED"; // 승인취소/신청취소 의미로 사용(서버 정책에 맞춤)

  // ✅ OPEN인데도 current>=total이면 사실상 FULL로 보여주는 게 혼란이 적음
  const isCapacityFull = (() => {
    const total = item.capacity?.total ?? 0;
    const current = item.capacity?.current ?? 0;
    return total > 0 && current >= total;
  })();

  const effectiveStatus: PostStatus = item.status === "OPEN" && isCapacityFull ? "FULL" : item.status;

  // ✅ 승인제에서 조건 불충족(canJoin=false)일 때 홈에서 "비활성"로 보여야 함
  // - 단, PENDING은 “진행 중 상태”라서 joinBlocked로 취급하면 안 됨
  const isJoinBlocked =
    effectiveStatus === "OPEN" &&
    ms === "NONE" &&
    canJoin === false &&
    !isPending;

  // ✅ 비활성 기준
  // - ENDED/CANCELED: 항상 비활성(내 기록/마이에서도 회색 처리)
  // - FULL: NONE일 때만 비활성 (내가 참여중/호스트면 굳이 죽이지 않음)
  // - STARTED: NONE일 때만 비활성(탐색 혼란 방지)
  // - 승인거절/승인취소: 항상 비활성
  const isDisabled =
    effectiveStatus === "ENDED" ||
    effectiveStatus === "CANCELED" ||
    (effectiveStatus === "FULL" && ms === "NONE") ||
    (effectiveStatus === "STARTED" && ms === "NONE") ||
    isJoinBlocked ||
    isRejected ||
    isMyCanceled;

  const pillTone = (hex: string, alpha = t.mode === "dark" ? 0.22 : 0.14): Pill => ({
    bg: withAlpha(hex, alpha),
    fg: hex,
  });

  const timePill: Pill = useMemo(() => {
    return isDisabled
      ? { bg: t.colors.overlay[8], fg: t.colors.textSub }
      : { bg: t.colors.overlay[6], fg: t.colors.textSub };
  }, [isDisabled, t.colors]);

  const statePill = useMemo(() => {
    if (!showStatusPill) return null;

    const label = statusLabel(effectiveStatus);
    if (!label) return null;

    switch (effectiveStatus) {
      case "FULL":
        return {
          label,
          icon: "people-outline" as const,
          pill: pillTone(t.colors.warning, t.mode === "dark" ? 0.26 : 0.16),
        };
      case "CANCELED":
        return {
          label,
          icon: "close-circle-outline" as const,
          pill: pillTone(t.colors.error, t.mode === "dark" ? 0.24 : 0.14),
        };
      case "ENDED":
        return {
          label,
          icon: "flag-outline" as const,
          pill: { bg: t.colors.overlay[8], fg: t.colors.textSub },
        };
      case "STARTED":
        return {
          label,
          icon: "play-circle-outline" as const,
          pill: pillTone(t.colors.primary, t.mode === "dark" ? 0.22 : 0.14),
        };
      default:
        return null;
    }
  }, [showStatusPill, effectiveStatus, t.colors, t.mode]);

  const leftBadge = useMemo(() => {
    if (isHost) return { label: "내 모임", tone: "primary" as const };
    if (isMember) return { label: "참여중", tone: "success" as const };
    if (isPending) return { label: "승인 대기", tone: "warning" as const };
    if (isRejected) return { label: "승인 거절", tone: "error" as const };
    if (isMyCanceled) return { label: "승인 취소", tone: "neutral" as const };

    if (showJoinBlockedBadge && isJoinBlocked) return { label: "조건 불충족", tone: "neutral" as const };
    return null;
  }, [isHost, isMember, isPending, isRejected, isMyCanceled, isJoinBlocked, showJoinBlockedBadge]);

  const joinModeMeta = useMemo(() => {
    const isInstant = item.joinMode === "INSTANT";
    const icon: IconName = isInstant ? "flash-outline" : "shield-checkmark-outline";
    const color = isInstant ? t.colors.point : t.colors.info;
    return { label: isInstant ? "선착순" : "승인제", icon, color };
  }, [item.joinMode, t.colors.point, t.colors.info]);

  const disabledStyle = useMemo(() => {
    if (!isDisabled) return null;

    if (effectiveStatus === "FULL") {
      return {
        bg: withAlpha(t.colors.warning, t.mode === "dark" ? 0.10 : 0.06),
        border: withAlpha(t.colors.warning, t.mode === "dark" ? 0.32 : 0.22),
        opacity: 0.9,
        title: withAlpha(t.colors.textMain, 0.78),
      };
    }
    if (effectiveStatus === "CANCELED" || effectiveStatus === "ENDED") {
      return {
        bg: t.colors.overlay[6],
        border: t.colors.overlay[12],
        opacity: 0.72,
        title: t.colors.textSub,
      };
    }
    // joinBlocked / rejected / myCanceled / started-none 등
    return {
      bg: t.colors.overlay[6],
      border: t.colors.border,
      opacity: 0.82,
      title: t.colors.textSub,
    };
  }, [isDisabled, effectiveStatus, t.colors, t.mode]);

  const titleColor = disabledStyle?.title ?? t.colors.textMain;
  const iconMuted = t.colors.icon?.muted ?? t.colors.textSub;
  const iconDefault = t.colors.icon?.default ?? t.colors.textMain;
  const joinInfoBg = t.colors.overlay[6];
  const androidLowerElevation = Platform.OS === "android" ? { elevation: 0, zIndex: 0 } : { zIndex: 0 };

  const locationName = item.location?.name || "장소 미정";
  const distanceText = item.distanceText ?? "";

  const capacityCurrent = item.capacity?.current ?? 0;
  const capacityTotal = item.capacity?.total ?? 0;

  return (
    <Card
      onPress={() => router.push(`/meetings/${item.id}`)}
      style={[
        styles.card,
        androidLowerElevation,
        {
          borderColor: disabledStyle?.border ?? t.colors.border,
          backgroundColor: disabledStyle?.bg,
          opacity: disabledStyle?.opacity ?? 1,
        },
      ]}
      padded
    >
      <View style={styles.headerRow}>
        <Text style={[t.typography.titleMedium, styles.title, { color: titleColor }]} numberOfLines={1}>
          {item.title}
        </Text>

        <View style={[styles.pill, { backgroundColor: timePill.bg }]}>
          <Ionicons name="time-outline" size={14} color={timePill.fg} style={{ marginRight: 4 }} />
          <Text style={[t.typography.labelMedium, { color: timePill.fg }]} numberOfLines={1}>
            {timeLabel}
          </Text>
        </View>
      </View>

      <View style={styles.locationRow}>
        <Ionicons name="map-outline" size={16} color={isDisabled ? iconMuted : iconDefault} />
        <Text style={[t.typography.bodyMedium, { color: t.colors.textSub }]} numberOfLines={1}>
          {locationName}
        </Text>

        {distanceText ? (
          <>
            <Text style={[t.typography.bodySmall, { color: t.colors.overlay[45], marginHorizontal: 4 }]}>|</Text>
            <Ionicons name="location-sharp" size={14} color={isDisabled ? iconMuted : t.colors.primary} />
            <Text style={[t.typography.labelSmall, { color: isDisabled ? t.colors.textSub : t.colors.primary }]}>
              {distanceText}
            </Text>
          </>
        ) : null}
      </View>

      <View style={styles.statusRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {leftBadge ? <Badge label={leftBadge.label} tone={leftBadge.tone} /> : null}

          {statePill ? (
            <View style={[styles.pill, { backgroundColor: statePill.pill.bg }]}>
              <Ionicons name={statePill.icon} size={14} color={statePill.pill.fg} style={{ marginRight: 6 }} />
              <Text style={[t.typography.labelSmall, { color: statePill.pill.fg, fontWeight: "800" }]}>
                {statePill.label}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.joinInfoBox, { backgroundColor: joinInfoBg }]}>
          <View style={styles.joinModeChip}>
            <Ionicons name={joinModeMeta.icon} size={14} color={joinModeMeta.color} style={{ marginRight: 4 }} />
            <Text style={[t.typography.labelSmall, { color: joinModeMeta.color, fontWeight: "800" }]}>
              {joinModeMeta.label}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: t.colors.overlay[12] }]} />
          <Ionicons name="people" size={14} color={t.colors.textSub} />
          <Text style={[t.typography.labelMedium, { color: t.colors.textSub, marginLeft: 4 }]}>
            <Text style={{ color: isDisabled ? t.colors.textSub : t.colors.primary, fontWeight: "800" }}>
              {capacityCurrent}
            </Text>
            /{capacityTotal}
          </Text>
        </View>
      </View>

      {showHostMessage && item.content ? (
        <View style={[styles.memoRow, { borderTopColor: t.colors.divider ?? t.colors.border }]}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={14}
            color={isDisabled ? iconMuted : iconDefault}
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
  card: { zIndex: 0, borderWidth: 1 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  title: { flex: 1 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 14 },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  joinInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 8,
  },
  joinModeChip: { flexDirection: "row", alignItems: "center" },
  divider: { width: 1, height: 12, marginHorizontal: 6 },
  memoRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
  },
});