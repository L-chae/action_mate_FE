import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  LayoutAnimation,
  Platform,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  UIManager,
  View,
  type SectionList as RNSectionList,
  type SectionListRenderItemInfo,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import AppLayout from "@/shared/ui/AppLayout";
import { Badge } from "@/shared/ui/Badge";
import { Card } from "@/shared/ui/Card";
import EmptyView from "@/shared/ui/EmptyView";
import { Fab } from "@/shared/ui/Fab";
import TopBar from "@/shared/ui/TopBar";
import CategoryChips from "@/shared/ui/CategoryChips";

import { MeetingCard } from "@/features/meetings/ui/MeetingCard";
import { meetingApi } from "@/features/meetings/api/meetingApi";
import type {
  CategoryKey,
  HotMeetingItem,
  MeetingPost,
  MembershipStatus,
} from "@/features/meetings/model/types";

import { useAuthStore } from "@/features/auth/model/authStore";

function isCapacityFull(m: MeetingPost) {
  const total = m.capacity?.total ?? 0;
  const current = m.capacity?.current ?? 0;
  return total > 0 && current >= total;
}

/**
 * ✅ 홈 리스트 노출 규칙(요청 반영)
 * - FULL/ENDED/CANCELED: 숨김
 * - capacity full(실제 정원 꽉참): 숨김
 * - myState.membershipStatus === CANCELED/REJECTED(승인 취소/거절): 숨김
 * - NONE인데 OPEN이 아니면(STARTED 등): 숨김
 * - NONE + INSTANT + canJoin=false: 숨김
 * - NONE + APPROVAL + canJoin=false: "비활성"로 보여야 하므로 숨기지 않음
 */
function shouldShowInHomeList(m: MeetingPost) {
  const ms: MembershipStatus = m.myState?.membershipStatus ?? "NONE";
  const canJoin = m.myState?.canJoin ?? true;

  if (ms === "CANCELED" || ms === "REJECTED") return false;
  if (m.status === "FULL" || m.status === "ENDED" || m.status === "CANCELED") return false;
  if (isCapacityFull(m)) return false;
  if (ms === "NONE" && m.status !== "OPEN") return false;
  if (ms === "NONE" && m.joinMode === "INSTANT" && canJoin === false) return false;

  return true;
}

const HOT_CARD_WIDTH = 168;
const HOT_CARD_HEIGHT = 190;
const HOT_CARD_GAP = 12;
const LIST_TOP_GAP = 12;

type FetchKind = "initial" | "refresh" | "filter";

export default function HomeScreen() {
  const t = useAppTheme();
  const router = useRouter();

  const nickname = useAuthStore((s) => s.user?.nickname);
  const displayName = `${nickname?.trim() || "회원"}님`;

  const [cat, setCat] = useState<CategoryKey | "ALL">("ALL");
  const [items, setItems] = useState<MeetingPost[]>([]);
  const [hotItems, setHotItems] = useState<HotMeetingItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtering, setFiltering] = useState(false);

  const pagePaddingH = t.spacing.pagePaddingH;

  // ✅ SectionList는 scrollToOffset이 아니라 scrollToLocation 사용(타입 안전)
  const listRef = useRef<RNSectionList<MeetingPost> | null>(null);

  // ✅ 레이스 방지: 마지막 요청만 반영
  const requestSeqRef = useRef(0);

  // ✅ 카테고리별 캐시: 재선택 시 즉시 표시(전환이 덜 "툭"함)
  const cacheRef = useRef(new Map<CategoryKey | "ALL", MeetingPost[]>());

  useEffect(() => {
    // 아이템 교체가 갑자기 튀는 느낌을 줄이기 위한 LayoutAnimation(선택)
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const fetchData = useCallback(async (kind: FetchKind, targetCat: CategoryKey | "ALL") => {
    const seq = ++requestSeqRef.current;

    if (kind === "initial") setLoading(true);
    if (kind === "refresh") setRefreshing(true);
    if (kind === "filter") setFiltering(true);

    try {
      // 1) 일반 목록
      let data: MeetingPost[] = [];
      try {
        data = await meetingApi.listMeetings(targetCat === "ALL" ? undefined : { category: targetCat });
      } catch (err) {
        console.warn("게시글 목록 로드 실패:", err);
        data = [];
      }

      const visibleData = data.filter(shouldShowInHomeList);

      if (seq === requestSeqRef.current) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setItems(visibleData);
        cacheRef.current.set(targetCat, visibleData);
      }

      // 2) 핫한 모임
      let hot: HotMeetingItem[] = [];
      try {
        hot = await meetingApi.listHotMeetings({ limit: 8, withinMinutes: 180 });
      } catch (err) {
        console.warn("핫한 모임 로드 실패:", err);
        hot = [];
      }

      const visibleHot = hot.filter((h) => {
        const total = h.capacity?.total ?? 0;
        const current = h.capacity?.current ?? 0;
        return !(total > 0 && current >= total);
      });

      if (seq === requestSeqRef.current) {
        setHotItems(visibleHot);
      }
    } catch (e) {
      console.error("HomeScreen 전체 로드 에러:", e);
    } finally {
      if (seq === requestSeqRef.current) {
        setLoading(false);
        setRefreshing(false);
        setFiltering(false);
      }
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    fetchData("initial", "ALL");
  }, [fetchData]);

  // ✅ 카테고리 변경
  useEffect(() => {
    // "왜 이렇게": SectionList는 scrollToOffset이 아니라 scrollToLocation이 표준이며,
    // header/sticky 구조에서도 가장 안전하게 '첫 아이템 기준 상단 이동'을 보장.
    try {
      listRef.current?.scrollToLocation({
        sectionIndex: 0,
        itemIndex: 0,
        animated: true,
        viewPosition: 0,
      });
    } catch {
      // 아이템이 0개인 순간(초기/전환)에는 scrollToLocation이 throw할 수 있어 무시
    }

    const cached = cacheRef.current.get(cat);
    if (cached) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setItems(cached);
    }

    fetchData("filter", cat);
  }, [cat, fetchData]);

  const lastFocusFetchAtRef = useRef(0);
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastFocusFetchAtRef.current < 800) return;
      lastFocusFetchAtRef.current = now;
      fetchData("refresh", cat);
    }, [fetchData, cat])
  );

  const onRefresh = useCallback(() => {
    fetchData("refresh", cat);
  }, [fetchData, cat]);

  const hotCardBorder = t.colors.divider ?? t.colors.border;

  const sections = useMemo(() => {
    return [{ key: "meetings", title: "meetings", data: items }];
  }, [items]);

  const renderHotItem = useCallback(
    ({ item }: { item: HotMeetingItem }) => {
      const total = Math.max(1, item.capacity?.total ?? 1);
      const current = Math.max(0, item.capacity?.current ?? 0);
      const progress = Math.min(1, current / total);
      const targetId = item.meetingId || item.id;

      return (
        <Card
          onPress={() => router.push(`/meetings/${targetId}`)}
          style={[
            styles.hotCard,
            {
              borderColor: hotCardBorder,
              backgroundColor: t.colors.surface ?? t.colors.background,
            },
          ]}
          padded
        >
          <Badge label={item.badge} tone="error" size="sm" style={{ marginBottom: 12 }} />

          <View style={{ gap: 6, marginBottom: 14 }}>
            <Text style={[t.typography.titleMedium, { color: t.colors.textMain }]} numberOfLines={1}>
              {item.title}
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Ionicons name="location-outline" size={14} color={t.colors.textSub} />
              <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]} numberOfLines={1}>
                {item.location?.name ?? ""}
              </Text>
            </View>
          </View>

          <View style={{ flex: 1 }} />

          <View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>참여 인원</Text>
              <Text style={[t.typography.labelSmall, { color: t.colors.primary }]}>
                {current}/{total}
              </Text>
            </View>

            <View style={[styles.track, { backgroundColor: t.colors.border }]}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.round(progress * 100)}%`, backgroundColor: t.colors.primary },
                ]}
              />
            </View>
          </View>
        </Card>
      );
    },
    [router, t, hotCardBorder]
  );

  const renderMeetingItem = useCallback(
    ({ item, index }: SectionListRenderItemInfo<MeetingPost>) => (
      <View style={{ paddingHorizontal: pagePaddingH }}>
        {index === 0 ? <View style={{ height: LIST_TOP_GAP }} /> : null}

        <MeetingCard
          item={item}
          showStatusPill={false}
          showJoinBlockedBadge={false}
          showHostMessage={false}
        />
      </View>
    ),
    [pagePaddingH]
  );

  const ListHeader = useMemo(() => {
    return (
      <View style={{ paddingBottom: 8 }}>
        <View style={{ paddingHorizontal: pagePaddingH, marginTop: 8, marginBottom: 14 }}>
          <Text style={[t.typography.headlineSmall, { color: t.colors.textMain }]}>
            {displayName}, 지금 참여 가능한{"\n"}
            <Text style={{ color: t.colors.primary }}>마감 임박 모임</Text>이에요!
          </Text>
        </View>

        {hotItems.length === 0 ? (
          <View style={{ paddingHorizontal: pagePaddingH, paddingBottom: 18 }}>
            <EmptyView title="지금 임박한 모임이 없어요" description="조금 뒤에 다시 확인해보세요!" />
          </View>
        ) : (
          <FlatList
            data={hotItems}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(it) => String(it.id || it.meetingId)}
            renderItem={renderHotItem}
            ItemSeparatorComponent={() => <View style={{ width: HOT_CARD_GAP }} />}
            contentContainerStyle={{
              paddingHorizontal: pagePaddingH,
              paddingBottom: 16,
            }}
            nestedScrollEnabled={false}
            removeClippedSubviews={Platform.OS === "android"}
          />
        )}
      </View>
    );
  }, [t, displayName, hotItems, pagePaddingH, renderHotItem]);

  const SectionHeader = useMemo(() => {
    return (
      <View style={[styles.stickyWrap, { backgroundColor: t.colors.background }]}>
        <CategoryChips value={cat} onChange={setCat} mode="filter" />

        {filtering ? (
          <View style={styles.filteringIndicator} pointerEvents="none">
            <ActivityIndicator size="small" color={t.colors.primary} />
          </View>
        ) : null}
      </View>
    );
  }, [t.colors.background, t.colors.primary, cat, filtering]);

  const ListEmpty = useMemo(() => {
    if (loading && !refreshing) {
      return (
        <View style={{ marginTop: 44 }}>
          <ActivityIndicator size="large" color={t.colors.primary} />
        </View>
      );
    }

    return (
      <View style={{ marginTop: 56, paddingHorizontal: pagePaddingH, minHeight: 320 }}>
        <EmptyView
          title="이런, 모임이 없네요"
          description={
            cat === "ALL"
              ? "현재 서버 연결 상태가 좋지 않거나,\n등록된 모임이 없습니다."
              : "이 카테고리에는 아직 모임이 없어요."
          }
        />
      </View>
    );
  }, [loading, refreshing, t.colors.primary, pagePaddingH, cat]);

  return (
    <AppLayout padded={false}>
      <TopBar
        logo={{ leftText: "Action", rightText: "Mate", iconName: "flash" }}
        showNoti
        showNotiDot
        onPressNoti={() => router.push("/notifications" as any)}
        showBorder
      />

      <SectionList
        ref={listRef}
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderMeetingItem}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderSectionHeader={() => SectionHeader}
        stickySectionHeadersEnabled
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={{ paddingBottom: 112 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={10}
        removeClippedSubviews={Platform.OS === "android"}
      />

      <Fab onPress={() => router.push("/meetings/create")} iconName="add" />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  hotCard: {
    width: HOT_CARD_WIDTH,
    height: HOT_CARD_HEIGHT,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
  },
  track: { height: 6, borderRadius: 99, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 99 },

  stickyWrap: {
    zIndex: 30,
    ...(Platform.OS === "android" ? { elevation: 3 } : {}),
  },
  filteringIndicator: {
    position: "absolute",
    right: 14,
    top: "50%",
    marginTop: -8,
  },
});
