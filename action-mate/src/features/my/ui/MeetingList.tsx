// src/features/my/ui/MeetingList.tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import EmptyView from "@/shared/ui/EmptyView";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { withAlpha } from "@/shared/theme/colors";

import type { MyMeetingItem } from "../model/types";

type Pill = { bg: string; fg: string };
type IconName = keyof typeof Ionicons.glyphMap;

type Props = {
  items: MyMeetingItem[];
  emptyText: string;

  editable?: boolean;
  onEdit?: (item: MyMeetingItem) => void;
  onDelete?: (item: MyMeetingItem) => void;

  /** ✅ 참여한 모임에서 ENDED 등 비활성화 */
  dimEnded?: boolean;
  /** ✅ 비활성화면 눌러도 이동 안함 */
  disableEndedPress?: boolean;

  /** ✅ 제목을 primary로(원하면) */
  titleTone?: "default" | "primary";
};

function isClosedStatus(s: any) {
  const v = String(s ?? "").toUpperCase();
  return v === "FULL" || v === "ENDED" || v === "CANCELED";
}

function statusLabel(s: any) {
  const v = String(s ?? "").toUpperCase();
  switch (v) {
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

function toSafeNumber(v: unknown, fallback = 0) {
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

/** ✅ joined/hosted 어디서든 "내 상태"를 최대한 찾아냄 */
function resolveMyMembership(item: any): "HOST" | "MEMBER" | "PENDING" | "" {
  const candidates = [
    item?.myJoinStatus, // ✅ (네 타입에 있었던 필드)
    item?.myState?.membershipStatus, // ✅ MeetingPost랑 통일될 때
    item?.membershipStatus,
    item?.joinStatus,
    item?.myStatus,
    item?.state,
  ];

  for (const c of candidates) {
    if (c == null) continue;
    const v = String(c).toUpperCase();

    if (v === "HOST") return "HOST";
    if (v === "MEMBER" || v === "JOINED" || v === "APPROVED") return "MEMBER";
    if (v === "PENDING" || v === "WAITING" || v === "REQUESTED") return "PENDING";
  }
  return "";
}

function resolveJoinMode(item: any): "INSTANT" | "APPROVAL" | "" {
  const instantBool = Boolean(item?.isInstant ?? item?.instantJoin ?? item?.allowInstant ?? item?.instant);
  const approvalBool = Boolean(item?.requiresApproval ?? item?.approvalRequired ?? item?.needApproval ?? item?.approval);

  if (instantBool) return "INSTANT";
  if (approvalBool) return "APPROVAL";

  const candidates = [
    item?.joinMode,
    item?.join_mode,
    item?.joinType,
    item?.join_type,
    item?.joinPolicy,
    item?.join_policy,

    item?.meeting?.joinMode,
    item?.meeting?.join_mode,
    item?.meeting?.joinType,
    item?.meeting?.join_type,

    item?.post?.joinMode,
    item?.post?.join_mode,
    item?.meetingPost?.joinMode,
    item?.meetingPost?.join_mode,
  ];

  for (const c of candidates) {
    if (c == null) continue;
    const s = String(c).toUpperCase();

    if (s.includes("INSTANT") || s.includes("FIRST") || s.includes("FCFS") || s.includes("선착") || s.includes("즉시")) {
      return "INSTANT";
    }
    if (s.includes("APPRO") || s.includes("APPROVAL") || s.includes("REQUEST") || s.includes("승인")) {
      return "APPROVAL";
    }
  }
  return "";
}

function pick(item: any) {
  const title = String(item?.title ?? "");
  const place = String(item?.place ?? item?.location?.name ?? item?.meeting?.location?.name ?? "");
  const dateText = String(item?.dateText ?? item?.meetingTimeText ?? item?.meeting?.meetingTimeText ?? "");
  const distanceText = String(item?.distanceText ?? item?.meeting?.distanceText ?? "").trim();

  const capacityCurrent = toSafeNumber(
    item?.capacity?.current ?? item?.memberCount ?? item?.currentCount ?? item?.capacityCurrent,
    0
  );
  const capacityTotal = toSafeNumber(
    item?.capacity?.total ?? item?.maxMemberCount ?? item?.capacityTotal ?? item?.capacityMax,
    0
  );

  const joinMode = resolveJoinMode(item);
  const status = item?.status ?? item?.meeting?.status;

  const myMembership = resolveMyMembership(item);

  return {
    title,
    place: place || "장소 미정",
    dateText,
    distanceText,
    capacityCurrent: Math.max(0, capacityCurrent),
    capacityTotal: Math.max(0, capacityTotal),
    joinMode,
    status,
    myMembership,
  };
}

export default function MeetingList({
  items,
  emptyText,
  editable = false,
  onDelete,
  dimEnded = false,
  disableEndedPress = false,
  titleTone = "default",
}: Props) {
  const t = useAppTheme();

  if (!items?.length) {
    return <EmptyView title={emptyText} description="새로운 모임을 만들어보거나 참여해보세요." />;
  }

  const pillTone = (hex: string, alpha = t.mode === "dark" ? 0.22 : 0.14): Pill => ({
    bg: withAlpha(hex, alpha),
    fg: hex,
  });

  const iconMuted = t.colors.icon?.muted ?? t.colors.textSub;
  const iconDefault = t.colors.icon?.default ?? t.colors.textMain;
  const joinInfoBg = t.colors.overlay[6];
  const point = (t.colors as any).point ?? t.colors.primary;

  return (
    <View style={{ gap: 12 }}>
      {items.map((raw) => {
        const m: any = raw;
        const d = pick(m);

        const closedByStatus = isClosedStatus(d.status);
        const shouldDim = dimEnded && closedByStatus;
        const canPress = !(disableEndedPress && shouldDim);

        const timePill: Pill = shouldDim
          ? { bg: t.colors.overlay[8], fg: t.colors.textSub }
          : { bg: t.colors.overlay[6], fg: t.colors.textSub };

        const statePill = (() => {
          const label = statusLabel(d.status);
          if (!label) return null;

          const v = String(d.status ?? "").toUpperCase();
          switch (v) {
            case "FULL":
              return { label, icon: "people-outline" as const, pill: pillTone(t.colors.warning, t.mode === "dark" ? 0.26 : 0.16) };
            case "CANCELED":
              return { label, icon: "close-circle-outline" as const, pill: pillTone(t.colors.error, t.mode === "dark" ? 0.24 : 0.14) };
            case "ENDED":
              return { label, icon: "flag-outline" as const, pill: { bg: t.colors.overlay[8], fg: t.colors.textSub } };
            case "STARTED":
              return { label, icon: "play-circle-outline" as const, pill: pillTone(t.colors.primary, t.mode === "dark" ? 0.22 : 0.14) };
            default:
              return null;
          }
        })();

        // ✅ (핵심) joined도 내 상태 뱃지 표시
        const myBadge = (() => {
          if (editable) return { label: "내 모임", tone: "primary" as const };

          if (d.myMembership === "PENDING") return { label: "승인중", tone: "warning" as const };
          if (d.myMembership === "MEMBER") return { label: "참여중", tone: "success" as const };
          if (d.myMembership === "HOST") return { label: "내 모임", tone: "primary" as const };

          return null;
        })();

        const joinModeMeta = (() => {
          if (!d.joinMode) return null;
          const isInstant = d.joinMode === "INSTANT";
          const icon: IconName = isInstant ? "flash-outline" : "shield-checkmark-outline";
          const color = isInstant ? point : t.colors.info;
          return { label: isInstant ? "선착순" : "승인제", icon, color };
        })();

        const disabledStyle = (() => {
          if (!shouldDim) return null;
          const v = String(d.status ?? "").toUpperCase();

          if (v === "FULL") {
            return {
              bg: withAlpha(t.colors.warning, t.mode === "dark" ? 0.10 : 0.06),
              border: withAlpha(t.colors.warning, t.mode === "dark" ? 0.32 : 0.22),
              opacity: 0.9,
              title: withAlpha(t.colors.textMain, 0.78),
            };
          }
          if (v === "CANCELED" || v === "ENDED") {
            return { bg: t.colors.overlay[6], border: t.colors.overlay[12], opacity: 0.72, title: t.colors.textSub };
          }
          return { bg: t.colors.overlay[6], border: t.colors.border, opacity: 0.82, title: t.colors.textSub };
        })();

        const titleColor =
          titleTone === "primary" && !disabledStyle?.title
            ? t.colors.primary
            : disabledStyle?.title ?? t.colors.textMain;

        const hasTotal = d.capacityTotal > 0;

        return (
          <Card
            key={String(m.id)}
            onPress={canPress ? () => router.push(`/meetings/${m.id}`) : undefined}
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
            {/* Header */}
            <View style={styles.headerRow}>
              <Text
                style={[t.typography.titleMedium, styles.title, { color: titleColor, fontWeight: "800" }]}
                numberOfLines={1}
              >
                {d.title}
              </Text>

              {!!d.dateText && (
                <View style={[styles.pill, { backgroundColor: timePill.bg }]}>
                  <Ionicons name="time-outline" size={14} color={timePill.fg} style={{ marginRight: 4 }} />
                  <Text style={[t.typography.labelMedium, { color: timePill.fg }]} numberOfLines={1}>
                    {d.dateText}
                  </Text>
                </View>
              )}

              {editable && !!onDelete && (
                <Pressable onPress={() => onDelete(raw)} hitSlop={10} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
                  <Text style={[t.typography.labelLarge, { color: t.colors.error }]}>삭제</Text>
                </Pressable>
              )}
            </View>

            {/* Location */}
            <View style={styles.locationRow}>
              <Ionicons name="map-outline" size={16} color={shouldDim ? iconMuted : iconDefault} />
              <Text style={[t.typography.bodyMedium, { color: t.colors.textSub }]} numberOfLines={1}>
                {d.place}
              </Text>

              {d.distanceText ? (
                <>
                  <Text style={[t.typography.bodySmall, { color: t.colors.overlay[45], marginHorizontal: 4 }]}>|</Text>
                  <Ionicons name="location-sharp" size={14} color={shouldDim ? iconMuted : t.colors.primary} />
                  <Text style={[t.typography.labelSmall, { color: shouldDim ? t.colors.textSub : t.colors.primary }]}>
                    {d.distanceText}
                  </Text>
                </>
              ) : null}
            </View>

            {/* Status + join info */}
            <View style={styles.statusRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {myBadge ? <Badge label={myBadge.label} tone={myBadge.tone} /> : null}

                {statePill ? (
                  <View style={[styles.pill, { backgroundColor: statePill.pill.bg }]}>
                    <Ionicons name={statePill.icon} size={14} color={statePill.pill.fg} style={{ marginRight: 6 }} />
                    <Text style={[t.typography.labelSmall, { color: statePill.pill.fg, fontWeight: "800" }]}>
                      {statePill.label}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* 승인제/선착순 → 인원 */}
              <View style={[styles.joinInfoBox, { backgroundColor: joinInfoBg }]}>
                {joinModeMeta ? (
                  <View style={styles.joinModeChip}>
                    <Ionicons name={joinModeMeta.icon} size={14} color={joinModeMeta.color} style={{ marginRight: 4 }} />
                    <Text style={[t.typography.labelSmall, { color: joinModeMeta.color, fontWeight: "800" }]}>
                      {joinModeMeta.label}
                    </Text>
                  </View>
                ) : null}

                {joinModeMeta ? <View style={[styles.divider, { backgroundColor: t.colors.overlay[12] }]} /> : null}

                <Ionicons name="people" size={14} color={t.colors.textSub} />
                <Text style={[t.typography.labelMedium, { color: t.colors.textSub, marginLeft: 4 }]}>
                  <Text style={{ color: shouldDim ? t.colors.textSub : t.colors.primary, fontWeight: "800" }}>
                    {d.capacityCurrent}
                  </Text>
                  {hasTotal ? `/${d.capacityTotal}` : "명"}
                </Text>
              </View>
            </View>

            {/* ✅ 호스트의 한마디(메모/소개) 제거됨 */}
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { zIndex: 0, borderWidth: 1 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 10 },
  title: { flex: 1 },
  pill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 14 },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  joinInfoBox: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, gap: 8 },
  joinModeChip: { flexDirection: "row", alignItems: "center" },
  divider: { width: 1, height: 12, marginHorizontal: 6 },
});
