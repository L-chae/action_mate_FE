import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  LayoutAnimation,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import AppLayout from "@/shared/ui/AppLayout";
import TopBar from "@/shared/ui/TopBar";
import EmptyView from "@/shared/ui/EmptyView";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

import { meetingApi } from "@/features/meetings/api/meetingApi";
import type { MeetingPost, MembershipStatus } from "@/features/meetings/model/types";
import { formatMeetingTime } from "@/shared/utils/formatTime";

// 안드로이드 LayoutAnimation 활성화
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ----------------------------------------------------------------------
// ✅ 1. Types & Constants
// ----------------------------------------------------------------------

type FilterKey = "ACTIVE" | "CANCELED" | "PENDING" | "ENDED";
type AnyMembership = MembershipStatus | "NONE" | "HOST" | "REJECTED" | "CANCELED";

type BadgeProps = {
  label: string;
  tone: "primary" | "error" | "neutral" | "warning";
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "ACTIVE", label: "진행중" },
  { key: "PENDING", label: "승인 대기" },
  { key: "CANCELED", label: "취소됨" },
  { key: "ENDED", label: "모임끝" },
];

// ----------------------------------------------------------------------
// ✅ 2. Custom Hook: Data Logic
// ----------------------------------------------------------------------

function useJoinedMeetings() {
  // 초기 로딩 true 설정 (깜빡임 방지)
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allList, setAllList] = useState<MeetingPost[]>([]);

  const fetchMeetings = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true);
    try {
      const res = await meetingApi.listMeetings({});
      
      // '참여' 목록이므로 내가 HOST인 것은 제외
      const filtered = (res ?? []).filter((m) => {
        const ms = (m.myState?.membershipStatus ?? "NONE") as AnyMembership;
        return ms !== "NONE" && ms !== "HOST";
      });
      
      setAllList(filtered);
    } catch (e) {
      console.error("Failed to fetch joined meetings:", e);
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

  return { allList, isLoading, refreshing, onRefresh };
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
            borderRadius: 16,
            borderWidth: 1,
            borderColor: t.colors.border,
            opacity: 0.5,
          }}
        />
      ))}
    </View>
  );
};

const FilterChips = React.memo(({ value, onChange }: { value: FilterKey; onChange: (v: FilterKey) => void }) => {
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
              <Text style={[
                t.typography.labelMedium,
                { color: selected ? "#FFFFFF" : t.colors.textSub, fontWeight: selected ? "bold" : "600" }
              ]}>
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
});

const JoinedMeetingItem = React.memo(({ item, onPress }: { item: MeetingPost; onPress: () => void }) => {
  const t = useAppTheme();
  
  const ms = (item.myState?.membershipStatus ?? "NONE") as AnyMembership;
  const isCanceled = ms === "REJECTED" || ms === "CANCELED" || item.status === "CANCELED";
  const isEnded = item.status === "ENDED";
  const isDisabled = isCanceled || isEnded;

  let badge: BadgeProps = { label: "진행중", tone: "primary" };
  if (ms === "PENDING") badge = { label: "승인 대기", tone: "warning" };
  else if (isCanceled) badge = { label: "취소됨", tone: "error" };
  else if (isEnded) badge = { label: "모임끝", tone: "neutral" };

  const timeStr = item.meetingTimeText?.trim() || formatMeetingTime(item.meetingTime);
  const joinMode = item.joinMode === "INSTANT" ? "선착순" : "승인제";

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
          {item.title}
        </Text>
        <Badge {...badge} />
      </View>
      <View style={styles.cardBody}>
        <Text style={t.typography.bodySmall} numberOfLines={1}>
          📍 {item.location?.name ?? "장소 미정"}
        </Text>
        <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]} numberOfLines={1}>
          📅 {timeStr} · {joinMode} · 👥 {item.capacity?.current ?? 0}/{item.capacity?.total ?? 0}
        </Text>
      </View>
    </Card>
  );
});

// ----------------------------------------------------------------------
// ✅ 4. Main Component
// ----------------------------------------------------------------------

export default function JoinedMeetingsScreen() {
  const t = useAppTheme();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>("ACTIVE");

  // Custom Hook 사용
  const { allList, isLoading, refreshing, onRefresh } = useJoinedMeetings();

  // 필터링 및 분류 로직 (Memoization)
  const { displayList, endedSectionList } = useMemo(() => {
    const getTimestamp = (m: MeetingPost) => (m.meetingTime ? new Date(m.meetingTime).getTime() : 0);
    const sorted = [...allList].sort((a, b) => getTimestamp(a) - getTimestamp(b));

    const pending: MeetingPost[] = [];
    const canceled: MeetingPost[] = [];
    const ended: MeetingPost[] = [];
    const active: MeetingPost[] = [];

    sorted.forEach((m) => {
      const ms = (m.myState?.membershipStatus ?? "NONE") as AnyMembership;
      
      if (ms === "PENDING") {
        pending.push(m);
      } else if (ms === "REJECTED" || ms === "CANCELED" || m.status === "CANCELED") {
        canceled.push(m);
      } else if (m.status === "ENDED") {
        ended.push(m);
      } else if (ms === "MEMBER") {
        // FULL 상태 등도 '참여중'이라면 여기에 포함
        active.push(m);
      }
    });

    if (filter === "PENDING") return { displayList: pending, endedSectionList: [] };
    if (filter === "CANCELED") return { displayList: canceled, endedSectionList: [] };
    if (filter === "ENDED") return { displayList: ended, endedSectionList: [] };

    // ACTIVE: 진행중 목록 + 하단 완료 목록
    return { displayList: active, endedSectionList: ended };
  }, [allList, filter]);

  // FlatList 렌더러
  const renderItem = useCallback(({ item }: { item: MeetingPost }) => (
    <JoinedMeetingItem item={item} onPress={() => router.push(`/meetings/${item.id}`)} />
  ), [router]);

  // 하단 완료 섹션 렌더러
  const ListFooter = useMemo(() => {
    if (filter !== "ACTIVE" || endedSectionList.length === 0) return null;
    return (
      <View style={styles.endedSection}>
        <Text style={[t.typography.titleSmall, { color: t.colors.textSub, marginBottom: 12 }]}>
          완료된 모임
        </Text>
        <View style={{ gap: 12 }}>
          {endedSectionList.map((item) => (
            <JoinedMeetingItem 
              key={item.id} 
              item={item} 
              onPress={() => {}} 
            />
          ))}
        </View>
      </View>
    );
  }, [filter, endedSectionList, t]);

  return (
    <AppLayout padded={false}>
      <TopBar
        title="참여한 모임"
        showBorder
        showBack
        onPressBack={() => router.back()}
      />

      <FilterChips value={filter} onChange={setFilter} />

      {isLoading ? (
        <ListSkeleton />
      ) : (
        <FlatList
          data={displayList}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: t.spacing.space[7] }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          
          // ✅ EmptyView 깜빡임 방지: 로딩 중이 아니고 데이터가 없을 때만 표시
          ListEmptyComponent={
            endedSectionList.length === 0 ? (
              <EmptyView 
                title="참여한 모임이 없어요" 
                description="새로운 모임에 참여해보세요!" 
                style={{ marginTop: 40 }}
                iconName="people-outline"
              />
            ) : null
          }
          ListFooterComponent={ListFooter}
          
          // 성능 최적화
          initialNumToRender={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
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
    borderTopColor: "#F0F0F0",
  },
});