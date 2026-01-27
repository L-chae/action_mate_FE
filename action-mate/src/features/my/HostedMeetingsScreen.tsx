import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
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

// ----------------------------------------------------------------------
// ✅ 1. Types & Constants
// ----------------------------------------------------------------------

type FilterKey = "ACTIVE" | "CANCELED" | "ENDED";

type HostedItemWithStatus = MyMeetingItem & {
  _status: PostStatus;
};

type BadgeProps = {
  label: string;
  tone: "primary" | "error" | "neutral" | "warning";
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "ACTIVE", label: "진행중" },
  { key: "CANCELED", label: "취소됨" },
  { key: "ENDED", label: "모임끝" },
];

// ----------------------------------------------------------------------
// ✅ 2. Custom Hook: Data Logic
// ----------------------------------------------------------------------

function useHostedMeetings() {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<HostedItemWithStatus[]>([]);

  const fetchMeetings = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true);

    try {
      const [hostedData, allMeetings] = await Promise.all([
        myApi.getHostedMeetings(),
        meetingApi.listMeetings({}),
      ]);

      const statusMap = new Map<string, PostStatus>();
      (allMeetings ?? []).forEach((m) => {
        const id = String((m as any)?.id ?? "");
        const st = (m as any)?.status as PostStatus | undefined;
        if (id) statusMap.set(id, st ?? "OPEN");
      });

      const merged: HostedItemWithStatus[] = (hostedData ?? []).map((it) => {
        const st = statusMap.get(String(it?.id ?? "")) ?? "OPEN";
        return {
          ...it,
          _status: st,
        };
      });

      setItems(merged);
    } catch (e) {
      console.error("Failed to fetch hosted meetings:", e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMeetings(true);
  }, [fetchMeetings]);

  return { items, isLoading, refreshing, onRefresh };
}

// ----------------------------------------------------------------------
// ✅ 3. Helper Components
// ----------------------------------------------------------------------

/** 스켈레톤 로딩 UI */
const ListSkeleton = () => {
  const t = useAppTheme();
  return (
    <View style={{ paddingHorizontal: 20, gap: 12, marginTop: 10 }}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            height: 100,
            backgroundColor: t.colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: t.colors.border,
            opacity: 0.5,
          }}
        />
      ))}
    </View>
  );
};

const FilterChips = React.memo(
  ({ value, onChange }: { value: FilterKey; onChange: (v: FilterKey) => void }) => {
    const t = useAppTheme();

    const handlePress = (key: FilterKey) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      onChange(key);
    };

    return (
      <View style={[styles.chipsWrap, { borderColor: t.colors.border, backgroundColor: t.colors.background }]}>
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
          renderItem={({ item }) => {
            const selected = value === item.key;
            return (
              <Pressable
                onPress={() => handlePress(item.key)}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: selected ? t.colors.primary : t.colors.chipBg,
                    borderWidth: selected ? 0 : 1,
                    borderColor: selected ? "transparent" : t.colors.border,
                    opacity: pressed ? 0.9 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <Text
                  style={[
                    t.typography.labelMedium,
                    {
                      color: selected ? "#FFFFFF" : t.colors.textSub,
                      fontWeight: selected ? "bold" : "600",
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>
    );
  }
);

const HostedMeetingItem = React.memo(({ item, onPress }: { item: HostedItemWithStatus; onPress: () => void }) => {
  const t = useAppTheme();

  const isEnded = item?._status === "ENDED";
  const isCanceled = item?._status === "CANCELED";
  const isDisabled = isEnded || isCanceled;

  let badge: BadgeProps = { label: "진행중", tone: "primary" };
  if (isCanceled) badge = { label: "취소됨", tone: "error" };
  else if (isEnded) badge = { label: "모임끝", tone: "neutral" };

  const locationName =
    typeof (item as any)?.locationName === "string" && (item as any).locationName.trim()
      ? (item as any).locationName
      : "장소 미정";

  return (
    <Card
      onPress={isDisabled ? undefined : onPress}
      style={[
        styles.card,
        {
          borderColor: t.colors.border,
          backgroundColor: isDisabled ? t.colors.overlay[6] : t.colors.surface,
          opacity: isDisabled ? 0.7 : 1,
          elevation: isDisabled ? 0 : 2,
          shadowColor: "#000",
          shadowOpacity: isDisabled ? 0 : 0.05,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 4,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text style={[t.typography.titleMedium, { flex: 1, marginRight: 8 }]} numberOfLines={1}>
          {item?.title ?? "(제목 없음)"}
        </Text>
        <Badge {...badge} />
      </View>

      <View style={styles.cardBody}>
        <Text style={t.typography.bodySmall} numberOfLines={1}>
          📍 {locationName}
        </Text>
        <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]} numberOfLines={1}>
          📅 {item?.dateText ?? ""} · 👥 {typeof item?.memberCount === "number" ? item.memberCount : 0}명
        </Text>
      </View>
    </Card>
  );
});

// ----------------------------------------------------------------------
// ✅ 4. Main Component
// ----------------------------------------------------------------------

export default function HostedMeetingsScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("ACTIVE");

  const { items, isLoading, refreshing, onRefresh } = useHostedMeetings();

  const { displayList, endedSectionList } = useMemo(() => {
    const active: HostedItemWithStatus[] = [];
    const canceled: HostedItemWithStatus[] = [];
    const ended: HostedItemWithStatus[] = [];

    const sorted = [...(items ?? [])].reverse();

    sorted.forEach((item) => {
      if (item?._status === "CANCELED") canceled.push(item);
      else if (item?._status === "ENDED") ended.push(item);
      else active.push(item);
    });

    if (filter === "CANCELED") return { displayList: canceled, endedSectionList: [] };
    if (filter === "ENDED") return { displayList: ended, endedSectionList: [] };

    return { displayList: active, endedSectionList: ended };
  }, [items, filter]);

  const renderItem = useCallback(
    ({ item }: { item: HostedItemWithStatus }) => (
      <HostedMeetingItem item={item} onPress={() => router.push(`/meetings/${String(item?.id ?? "")}`)} />
    ),
    [router]
  );

  const ListFooter = useMemo(() => {
    if (filter !== "ACTIVE" || (endedSectionList ?? []).length === 0) return null;

    return (
      <View style={[styles.endedSection, { borderTopColor: t.colors.border }]}>
        <Text style={[t.typography.titleSmall, { color: t.colors.textSub, marginBottom: 12 }]}>완료된 모임</Text>
        <View style={{ gap: 12 }}>
          {(endedSectionList ?? []).map((item) => (
            <HostedMeetingItem key={String(item?.id ?? "")} item={item} onPress={() => {}} />
          ))}
        </View>
      </View>
    );
  }, [filter, endedSectionList, t]);

  return (
    <AppLayout padded={false}>
      <TopBar title="내가 만든 모임" showBorder showBack onPressBack={() => router.back()} />

      <FilterChips value={filter} onChange={setFilter} />

      {isLoading ? (
        <ListSkeleton />
      ) : (
        <FlatList
          data={displayList ?? []}
          renderItem={renderItem}
          keyExtractor={(item) => String(item?.id ?? "")}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: t.spacing.space[7] }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            (endedSectionList ?? []).length === 0 ? (
              <EmptyView
                title="만든 모임이 없어요"
                description="새로운 모임을 주최해보세요!"
                style={{ marginTop: 40 }}
                iconName="create-outline"
              />
            ) : null
          }
          ListFooterComponent={ListFooter}
          initialNumToRender={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === "android"}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  chipsWrap: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    zIndex: 1,
  },
  chipsScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  card: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  cardBody: {
    gap: 6,
  },
  endedSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
  },
});

// 3줄 요약
// - MyMeetingItem이 locationName(string)으로 바뀌어서 item.location?.name 접근을 item.locationName으로 교체했습니다.
// - 로딩/데이터가 undefined여도 화면이 안 깨지도록 안전한 기본값 처리와 String 캐스팅을 추가했습니다.
// - ended 섹션 border 색도 theme border로 맞춰 일관되게 처리했습니다.