import React, { useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { withAlpha } from "@/shared/theme/colors";
import type { MeetingPost } from "@/features/meetings/model/types";
import { meetingTimeTextFromIso } from "@/shared/utils/timeText";

type Pill = { bg: string; fg: string };
type IconName = keyof typeof Ionicons.glyphMap;

function isClosedStatus(s: MeetingPost["status"]) {
  return s === "FULL" || s === "ENDED" || s === "CANCELED";
}

function statusLabel(s: MeetingPost["status"]) {
  switch (s) {
    case "FULL":
      return "정원마감";
    case "CANCELED":
      return "취소됨";
    case "ENDED":
      return "종료됨";
    case "STARTED":
      return "진행중";
    default:
      return null;
  }
}

export function MeetingCard({ item }: { item: MeetingPost }) {
  const t = useAppTheme();
  const router = useRouter();

  const timeLabel = useMemo(() => {
    // meetingTime이 있으면 우선 사용, 없으면 meetingTimeText (구버전 호환)
    if (item.meetingTime) return meetingTimeTextFromIso(item.meetingTime);
    return item.meetingTimeText ?? "";
  }, [item.meetingTime, item.meetingTimeText]);

  const myStatus = item.myState?.membershipStatus;
  const isHost = myStatus === "HOST";
  const isMember = myStatus === "MEMBER";
  const isPending = myStatus === "PENDING";

  const isClosed = isClosedStatus(item.status);

  // ✅ 핵심: 승인 대기(PENDING)는 실패/비활성 상태가 아니라 "진행 중 상태"
  // canJoin=false가 내려와도 joinBlocked로 취급하면 카드가 회색(비활성)처럼 보여 오해를 만든다.
  const isJoinBlocked =
    !isClosed &&
    !isPending &&
    !item.myState?.canJoin &&
    !isHost &&
    !isMember &&
    item.status !== "STARTED";

  const isDisabled = isClosed || isJoinBlocked;

  const pillTone = (hex: string, alpha = t.mode === "dark" ? 0.22 : 0.14): Pill => ({
    bg: withAlpha(hex, alpha),
    fg: hex,
  });

  const timePill: Pill = useMemo(() => {
    // 승인대기는 정상 톤 유지가 목적이므로 isDisabled 기준을 그대로 쓰되,
    // 위에서 PENDING을 joinBlocked에서 제외했기 때문에 PENDING은 정상 톤이 된다.
    return isDisabled
      ? { bg: t.colors.overlay[8], fg: t.colors.textSub }
      : { bg: t.colors.overlay[6], fg: t.colors.textSub };
  }, [isDisabled, t.colors]);

  const statePill = useMemo(() => {
    const label = statusLabel(item.status);
    if (!label) return null;

    switch (item.status) {
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
  }, [item.status, t.colors, t.mode]);

  const leftBadge = useMemo(() => {
    if (isHost) return { label: "내 모임", tone: "primary" as const };
    if (isMember) return { label: "참여중", tone: "success" as const };
    if (isPending) return { label: "승인 대기", tone: "warning" as const };
    if (isJoinBlocked) return { label: "참여불가", tone: "neutral" as const };
    return null;
  }, [isHost, isMember, isPending, isJoinBlocked]);

  const joinModeMeta = useMemo(() => {
    const isInstant = item.joinMode === "INSTANT";
    const icon: IconName = isInstant ? "flash-outline" : "shield-checkmark-outline";
    const color = isInstant ? t.colors.point : t.colors.info;
    return { label: isInstant ? "선착순" : "승인제", icon, color };
  }, [item.joinMode, t.colors.point, t.colors.info]);

  const disabledStyle = useMemo(() => {
    if (!isDisabled) return null;

    // FULL은 "마감" 성격이 강해서 경고톤을 살리고,
    // CANCELED/ENDED는 회색 계열로 더 죽이는 것이 일반적으로 자연스럽다.
    if (item.status === "FULL") {
      return {
        bg: withAlpha(t.colors.warning, t.mode === "dark" ? 0.10 : 0.06),
        border: withAlpha(t.colors.warning, t.mode === "dark" ? 0.32 : 0.22),
        opacity: 0.9,
        title: withAlpha(t.colors.textMain, 0.78),
      };
    }
    if (item.status === "CANCELED" || item.status === "ENDED") {
      return {
        bg: t.colors.overlay[6],
        border: t.colors.overlay[12],
        opacity: 0.72,
        title: t.colors.textSub,
      };
    }
    return {
      bg: t.colors.overlay[6],
      border: t.colors.border,
      opacity: 0.82,
      title: t.colors.textSub,
    };
  }, [isDisabled, item.status, t.colors, t.mode]);

  const titleColor = disabledStyle?.title ?? t.colors.textMain;
  const iconMuted = t.colors.icon?.muted ?? t.colors.textSub;
  const iconDefault = t.colors.icon?.default ?? t.colors.textMain;
  const joinInfoBg = t.colors.overlay[6];
  const androidLowerElevation = Platform.OS === "android" ? { elevation: 0, zIndex: 0 } : { zIndex: 0 };

  // ✅ 안전한 데이터 접근
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

      {item.content ? (
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