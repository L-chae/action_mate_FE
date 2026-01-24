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

import { myApi } from "@/features/my/api/myApi";
import type { MyMeetingItem } from "@/features/my/model/types";

import { meetingApi } from "@/features/meetings/api/meetingApi";
import type { PostStatus } from "@/features/meetings/model/types";

type FilterKey = "ACTIVE" | "CANCELED" | "ENDED";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "ACTIVE", label: "진행중" },
  { key: "CANCELED", label: "취소됨" },
  { key: "ENDED", label: "모임끝" },
];

type HostedItemWithStatus = MyMeetingItem & { _status: PostStatus };

function toTimeValue(item: MyMeetingItem) {
  // 서버에서 dateText만 있다면 정렬이 완벽하진 않지만,
  // hosted쪽은 최소한 "있을 때라도" 안정적으로 정렬되게 처리
  const raw = (item as any)?.meetingTime ?? (item as any)?.startAt ?? (item as any)?.date;
  if (!raw) return Number.POSITIVE_INFINITY;
  const v = new Date(raw).getTime();
  return Number.isFinite(v) ? v : Number.POSITIVE_INFINITY;
}

function getHostBadge(st: PostStatus) {
  // ✅ 뱃지: 진행중 / 취소됨 / 모임끝 만
  if (st === "CANCELED") return { label: "취소됨", tone: "error" as const };
  if (st === "ENDED") return { label: "모임끝", tone: "neutral" as const };

  // ✅ FULL도 진행중으로 통일
  return { label: "진행중", tone: "primary" as const };
}

function isDisabledStatus(st: PostStatus) {
  return st === "ENDED" || st === "CANCELED";
}

/** ✅ 칩 바(카테고리 칩 느낌) */
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
                    backgroundColor: selected ? (t.colors.primary as string) : t.colors.chipBg,
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

export default function HostedMeetingsScreen() {
  const t = useAppTheme();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("ACTIVE");

  const [hostedItems, setHostedItems] = useState<MyMeetingItem[]>([]);
  const [statusById, setStatusById] = useState<Record<string, PostStatus>>({});

  const load = useCallback(async () => {
    const [hosted, all] = await Promise.all([
      myApi.getHostedMeetings(),
      meetingApi.listMeetings({}),
    ]);

    setHostedItems(hosted ?? []);

    const map: Record<string, PostStatus> = {};
    for (const m of all ?? []) {
      map[String((m as any).id ?? m.id)] = (m as any).status;
    }
    setStatusById(map);
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

  const enriched = useMemo<HostedItemWithStatus[]>(() => {
    return (hostedItems ?? []).map((it) => {
      const st = statusById[String(it.id)] ?? "OPEN";
      return { ...(it as any), _status: st };
    });
  }, [hostedItems, statusById]);

  const { primaryList, endedList } = useMemo(() => {
    const sortAsc = (arr: HostedItemWithStatus[]) =>
      arr.sort((a, b) => toTimeValue(a) - toTimeValue(b));

    const active = sortAsc(
      enriched.filter((m) => m._status !== "ENDED" && m._status !== "CANCELED")
    );

    const canceled = sortAsc(enriched.filter((m) => m._status === "CANCELED"));
    const ended = sortAsc(enriched.filter((m) => m._status === "ENDED"));

    switch (filter) {
      case "CANCELED":
        return { primaryList: canceled, endedList: [] };
      case "ENDED":
        return { primaryList: ended, endedList: [] };
      default:
        // ACTIVE: 진행중 목록 + 완료된 모임(맨 아래 섹션)
        return { primaryList: active, endedList: ended };
    }
  }, [enriched, filter]);

  const renderItem = useCallback(
    (m: HostedItemWithStatus) => {
      const badge = getHostBadge(m._status);
      const disabled = isDisabledStatus(m._status);

      const placeText = (m as any).location?.name ?? "장소 미정";

      return (
        <Card
          key={String(m.id)}
          onPress={disabled ? undefined : () => router.push(`/meetings/${m.id}`)}
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
              {m.title}
            </Text>
            <Badge label={badge.label} tone={badge.tone} />
          </View>

          <View style={{ marginTop: 8, gap: 4 }}>
            <Text style={t.typography.bodySmall} numberOfLines={1}>
              {placeText}
            </Text>
            <Text style={t.typography.bodySmall} numberOfLines={1}>
              {m.dateText} · {m.memberCount}명
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
        title="내가 만든 모임"
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

            {/* ✅ 진행중 탭에서만: 완료된 모임 섹션 맨 아래 */}
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

                <View style={{ gap: 12 }}>{endedList.map(renderItem)}</View>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  chipsWrap: { zIndex: 5 },
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
