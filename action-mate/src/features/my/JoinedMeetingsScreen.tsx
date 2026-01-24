import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";

import AppLayout from "@/shared/ui/AppLayout";
import TopBar from "@/shared/ui/TopBar";
import EmptyView from "@/shared/ui/EmptyView";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

import { meetingApi } from "@/features/meetings/api/meetingApi";
import type {
  MeetingPost,
  MembershipStatus,
  PostStatus,
} from "@/features/meetings/model/types";
import { formatMeetingTime } from "@/shared/utils/formatTime";

type AnyMembership = MembershipStatus | "NONE" | "HOST" | "REJECTED" | "CANCELED";

type FilterKey = "ACTIVE" | "CANCELED" | "PENDING" | "ENDED";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "ACTIVE", label: "진행중" },
  { key: "CANCELED", label: "취소됨" },
  { key: "PENDING", label: "승인 대기" },
  { key: "ENDED", label: "모임끝" },
];

function toTimeValue(m: MeetingPost) {
  const raw = (m as any)?.meetingTime ?? (m as any)?.startAt ?? (m as any)?.date;
  if (!raw) return Number.POSITIVE_INFINITY;
  const v = new Date(raw).getTime();
  return Number.isFinite(v) ? v : Number.POSITIVE_INFINITY;
}

/** ✅ 뱃지 라벨/톤: 진행중, 취소됨, 승인 대기, 모임끝 만 */
function getMainBadge(m: MeetingPost) {
  const ms = (m.myState?.membershipStatus ?? "NONE") as AnyMembership;

  // 승인 대기 최우선
  if (ms === "PENDING") return { label: "승인 대기", tone: "warning" as const };

  // 취소/거절
  if (ms === "REJECTED" || ms === "CANCELED" || m.status === "CANCELED") {
    return { label: "취소됨", tone: "error" as const };
  }

  // 모임끝
  if (m.status === "ENDED") return { label: "모임끝", tone: "neutral" as const };

  // ✅ 정원마감(FULL)도 진행중으로 통일
  return { label: "진행중", tone: "primary" as const };
}

function isDisabled(m: MeetingPost) {
  const ms = (m.myState?.membershipStatus ?? "NONE") as AnyMembership;
  return (
    m.status === "ENDED" ||
    m.status === "CANCELED" ||
    ms === "REJECTED" ||
    ms === "CANCELED"
  );
}

/** ✅ 칩 바 (카테고리 칩 느낌) */
function FilterChips({
  value,
  onChange,
}: {
  value: FilterKey;
  onChange: (v: FilterKey) => void;
}) {
  const t = useAppTheme();

  return (
    <View
      style={[
        styles.chipsWrap,
        {
          paddingHorizontal: t.spacing.pagePaddingH,
          paddingTop: 10,
          paddingBottom: 8,
          borderBottomWidth: t.spacing.borderWidth,
          borderBottomColor: t.colors.border,
          backgroundColor: t.colors.background,
        },
      ]}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {FILTERS.map((f) => {
            const selected = value === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => onChange(f.key)}
                hitSlop={10}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: selected ? t.colors.primary : t.colors.chipBg,
                    opacity: pressed ? 0.88 : 1,
                    borderWidth: selected ? 0 : t.spacing.borderWidth,
                    borderColor: selected ? "transparent" : t.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    t.typography.labelMedium,
                    {
                      color: selected ? "#FFFFFF" : t.colors.textSub,
                      fontWeight: selected ? "800" : "600",
                    },
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

export default function JoinedMeetingsScreen() {
  const t = useAppTheme();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [allJoined, setAllJoined] = useState<MeetingPost[]>([]);
  const [filter, setFilter] = useState<FilterKey>("ACTIVE");

  const load = useCallback(async () => {
    const all = await meetingApi.listMeetings({});

    // ✅ "내가 참여/신청한" 것만: NONE/HOST 제외
    const joinedOnly = (all ?? []).filter((m) => {
      const ms = (m.myState?.membershipStatus ?? "NONE") as AnyMembership;
      return ms !== "NONE" && ms !== "HOST";
    });

    setAllJoined(joinedOnly);
  }, []);

  useEffect(() => {
    load().catch(console.error);
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  /** ✅ 진행중 탭: "진행중 목록" + 아래 "완료된 모임" 섹션(맨 아래) */
  const { primaryList, endedList } = useMemo(() => {
    const msOf = (m: MeetingPost) =>
      (m.myState?.membershipStatus ?? "NONE") as AnyMembership;

    const sortAsc = (arr: MeetingPost[]) => arr.sort((a, b) => toTimeValue(a) - toTimeValue(b));

    const pending = sortAsc(
      allJoined.filter((m) => msOf(m) === "PENDING")
    );

    const canceled = sortAsc(
      allJoined.filter(
        (m) =>
          msOf(m) === "REJECTED" ||
          msOf(m) === "CANCELED" ||
          m.status === "CANCELED"
      )
    );

    const ended = sortAsc(allJoined.filter((m) => m.status === "ENDED"));

    // ✅ 진행중 = MEMBER이면서 (ENDED/CANCELED 제외)
    // FULL도 여기 포함 (진행중으로 표시)
    const active = sortAsc(
      allJoined.filter((m) => {
        const ms = msOf(m);
        if (ms !== "MEMBER") return false;
        if (m.status === "ENDED" || m.status === "CANCELED") return false;
        return true;
      })
    );

    switch (filter) {
      case "PENDING":
        return { primaryList: pending, endedList: [] };
      case "CANCELED":
        return { primaryList: canceled, endedList: [] };
      case "ENDED":
        return { primaryList: ended, endedList: [] };
      default:
        // ACTIVE: 진행중 목록 + 완료된 모임(맨 아래 섹션)
        return { primaryList: active, endedList: ended };
    }
  }, [allJoined, filter]);

  const renderItem = useCallback(
    (m: MeetingPost) => {
      const badge = getMainBadge(m);
      const disabled = isDisabled(m);

      const joinModeText = (m as any).joinMode === "INSTANT" ? "선착순" : "승인제";
      const timeText = (m as any).meetingTimeText?.trim()
        ? (m as any).meetingTimeText
        : formatMeetingTime((m as any).meetingTime);

      return (
        <Card
          key={String((m as any).id)}
          onPress={disabled ? undefined : () => router.push(`/meetings/${(m as any).id}`)}
          style={[
            styles.card,
            {
              borderColor: t.colors.border,
              backgroundColor: disabled ? t.colors.overlay[6] : t.colors.surface,
              opacity: disabled ? 0.45 : 1,
            },
          ]}
        >
          <View style={styles.topRow}>
            <Text style={t.typography.titleMedium} numberOfLines={1}>
              {(m as any).title}
            </Text>
            <Badge label={badge.label} tone={badge.tone} />
          </View>

          <View style={{ marginTop: 8, gap: 4 }}>
            <Text style={t.typography.bodySmall} numberOfLines={1}>
              {(m as any).location?.name ?? "장소 미정"}
            </Text>
            <Text style={t.typography.bodySmall} numberOfLines={1}>
              {timeText} · {joinModeText} · {(m as any).capacity?.current ?? 0}/
              {(m as any).capacity?.total ?? 0}명
            </Text>
          </View>
        </Card>
      );
    },
    [router, t]
  );

  return (
    <AppLayout padded={false}>
      <TopBar
        title="참여한 모임"
        showBorder
        showBack
        onPressBack={() => router.replace("/my")}
      />

      <FilterChips value={filter} onChange={setFilter} />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: t.spacing.pagePaddingH,
          paddingVertical: 14,
          paddingBottom: t.spacing.space[7],
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {primaryList.length === 0 && endedList.length === 0 ? (
          <EmptyView title="목록이 비어있어요" description="조건에 맞는 모임이 없습니다." />
        ) : (
          <View style={{ gap: 12 }}>
            {primaryList.map(renderItem)}

            {/* ✅ 진행중 탭에서만: 완료된 모임 섹션을 맨 아래로 */}
            {filter === "ACTIVE" && endedList.length > 0 ? (
              <View style={{ marginTop: 6 }}>
                <Text
                  style={[
                    t.typography.titleSmall,
                    { color: t.colors.textSub, marginBottom: 10 },
                  ]}
                >
                  완료된 모임
                </Text>

                <View style={{ gap: 12 }}>
                  {endedList.map(renderItem)}
                </View>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  chipsWrap: {
    zIndex: 5,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },

  card: { paddingVertical: 14, paddingHorizontal: 14, borderWidth: 1 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
});
