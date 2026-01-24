//src/features/my/ui/MyMeetingRow.tsx
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { withAlpha } from "@/shared/theme/colors";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { formatMeetingTime } from "@/shared/utils/formatTime";

import type { MeetingPost, MembershipStatus, PostStatus } from "@/features/meetings/model/types";

type Props = {
  item: MeetingPost;
  onPress?: () => void;
};

function membershipLabel(ms: MembershipStatus) {
  switch (ms) {
    case "HOST":
      return { label: "내 모임", tone: "primary" as const };
    case "MEMBER":
      return { label: "참여중", tone: "success" as const };
    case "PENDING":
      return { label: "승인 대기", tone: "warning" as const };
    case "REJECTED":
      return { label: "승인 거절", tone: "error" as const };
    case "CANCELED":
      return { label: "승인 취소", tone: "neutral" as const };
    default:
      return null;
  }
}

function statusLabel(s: PostStatus) {
  switch (s) {
    case "STARTED":
      return { label: "진행중", tone: "primary" as const };
    case "FULL":
      return { label: "정원마감", tone: "warning" as const };
    case "ENDED":
      return { label: "끝남", tone: "neutral" as const };
    case "CANCELED":
      return { label: "취소됨", tone: "error" as const };
    default:
      return null;
  }
}

export default function MyMeetingRow({ item, onPress }: Props) {
  const t = useAppTheme();

  const ms: MembershipStatus = item.myState?.membershipStatus ?? "NONE";

  const isCapacityFull = (() => {
    const total = item.capacity?.total ?? 0;
    const current = item.capacity?.current ?? 0;
    return total > 0 && current >= total;
  })();

  // OPEN인데도 정원 꽉 차면 FULL처럼 보여주기
  const effectiveStatus: PostStatus =
    item.status === "OPEN" && isCapacityFull ? "FULL" : item.status;

  const membershipBadge = useMemo(() => membershipLabel(ms), [ms]);
  const statusBadge = useMemo(() => statusLabel(effectiveStatus), [effectiveStatus]);

  const timeText = useMemo(() => {
    if (item.meetingTimeText?.trim()) return item.meetingTimeText;
    return formatMeetingTime(item.meetingTime);
  }, [item.meetingTime, item.meetingTimeText]);

  const joinModeText = item.joinMode === "INSTANT" ? "선착순" : "승인제";

  const isDisabled =
    effectiveStatus === "ENDED" ||
    effectiveStatus === "CANCELED" ||
    ms === "REJECTED" ||
    ms === "CANCELED";

  const cardBg = isDisabled ? t.colors.overlay[6] : t.colors.surface;
  const cardBorder = isDisabled ? t.colors.border : t.colors.border;
  const titleColor = isDisabled ? t.colors.textSub : t.colors.textMain;

  return (
    <Card
      onPress={onPress}
      padded={false}
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor: cardBorder,
          opacity: isDisabled ? 0.86 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.inner,
          {
            paddingHorizontal: t.spacing.pagePaddingH,
            paddingVertical: t.spacing.space[3],
          },
        ]}
      >
        {/* Title Row */}
        <View style={styles.titleRow}>
          <Text style={[t.typography.titleMedium, { color: titleColor, flex: 1 }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={t.colors.icon.muted} />
        </View>

        {/* Badges */}
        <View style={styles.badgeRow}>
          {membershipBadge ? <Badge label={membershipBadge.label} tone={membershipBadge.tone} /> : null}
          {statusBadge ? <Badge label={statusBadge.label} tone={statusBadge.tone} /> : null}
        </View>

        {/* Info */}
        <View style={styles.infoRow}>
          <View style={styles.infoLine}>
            <Ionicons name="location-outline" size={14} color={t.colors.icon.muted} />
            <Text style={[t.typography.bodySmall, { color: t.colors.textSub, flex: 1 }]} numberOfLines={1}>
              {item.location?.name ?? "장소 미정"}
            </Text>

            <Text style={[t.typography.bodySmall, { color: withAlpha(t.colors.textSub, 0.6) }]}>·</Text>

            <Ionicons name="time-outline" size={14} color={t.colors.icon.muted} />
            <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]} numberOfLines={1}>
              {timeText}
            </Text>
          </View>

          <View style={styles.infoLine}>
            <Ionicons
              name={item.joinMode === "INSTANT" ? "flash-outline" : "shield-checkmark-outline"}
              size={14}
              color={item.joinMode === "INSTANT" ? t.colors.point : t.colors.info}
            />
            <Text style={[t.typography.labelSmall, { color: t.colors.textSub, fontWeight: "800" }]}>
              {joinModeText}
            </Text>

            <Text style={[t.typography.bodySmall, { color: withAlpha(t.colors.textSub, 0.6) }]}>·</Text>

            <Ionicons name="people-outline" size={14} color={t.colors.icon.muted} />
            <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>
              <Text style={{ color: t.colors.primary, fontWeight: "900" }}>{item.capacity?.current ?? 0}</Text>/
              {item.capacity?.total ?? 0}명
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  inner: { gap: 8 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  infoRow: { gap: 6 },
  infoLine: { flexDirection: "row", alignItems: "center", gap: 6 },
});
