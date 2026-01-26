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
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const HOT_CARD_WIDTH = 160;
const HOT_CARD_HEIGHT = 200;
const HOT_CARD_GAP = 12;

type FetchKind = "initial" | "refresh" | "filter";

// [유틸] 만원 여부
function isCapacityFull(m: MeetingPost) {
  const total = m.capacity?.total ?? 0;
  const current = m.capacity?.current ?? 0;
  return total > 0 && current >= total;
}

// [유틸] 홈 노출 필터
function shouldShowInHomeList(m: MeetingPost) {
  const ms: MembershipStatus = m.myState?.membershipStatus ?? "NONE";
  const canJoin = m.myState?.canJoin ?? true;

  if (ms === "CANCELED" || ms === "REJECTED") return false;
  if (m.status === "FULL" || m.status === "ENDED" || m.status === "CANCELED") return false;
  if (isCapacityFull(m)) return false;
  if (ms === "NONE" && m.joinMode === "INSTANT" && canJoin === false) return false;

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────

/** 핫한 모임 카드 (Memoized) */
const HotCardItem = React.memo(function HotCardItem({
  item,
  onPress,
  t,
  s,
}: {
  item: HotMeetingItem;
  onPress: (id: string) => void;
  t: ReturnType<typeof useAppTheme>;
  s: ReturnType<typeof createStyles>;
}) {
  const total = Math.max(1, item.capacity?.total ?? 1);
  const current = Math.max(0, item.capacity?.current ?? 0);
  const percent = Math.min(1, current / total);

  // 진행률 색상: 꽉 찰수록 붉은색, 널널하면 프라이머리
  const barColor = percent > 0.8 ? t.colors.error : t.colors.primary;

  return (
    <Card
      onPress={() => onPress(String(item.meetingId || item.id))}
      padded={false}
      style={[s.hotCard, { width: HOT_CARD_WIDTH, height: HOT_CARD_HEIGHT }]}
    >
      <View style={s.hotCardContent}>
        <View style={s.hotBadgeRow}>
          <Badge label={item.badge} tone="error" size="sm" />
        </View>

        <Text style={s.hotTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={s.hotLocationRow}>
          <Ionicons name="location-sharp" size={12} color={t.colors.icon.muted} />
          <Text style={s.hotLocationText} numberOfLines={1}>
            {item.location?.name ?? "장소 미정"}
          </Text>
        </View>

        <View style={s.flex1} />

        <View>
          <View style={s.hotMetaRow}>
            <Text style={s.hotMetaLabel}>현재 참여</Text>
            <Text style={[s.hotMetaValue, { color: barColor }]}>
              {current}/{total}명
            </Text>
          </View>

          <View style={s.hotProgressTrack}>
            <View
              style={[
                s.hotProgressFill,
                { width: `${Math.round(percent * 100)}%`, backgroundColor: barColor },
              ]}
            />
          </View>
        </View>
      </View>
    </Card>
  );
});

/** 리스트 헤더 (인사말 + 핫 모임) */
const HomeHeader = React.memo(function HomeHeader({
  t,
  s,
  displayName,
  hotItems,
  onPressHot,
  pagePaddingH,
}: {
  t: ReturnType<typeof useAppTheme>;
  s: ReturnType<typeof createStyles>;
  displayName: string;
  hotItems: HotMeetingItem[];
  onPressHot: (id: string) => void;
  pagePaddingH: number;
}) {
  return (
    <View style={s.headerWrap}>
      <View style={[s.greetingWrap, { paddingHorizontal: pagePaddingH }]}>
        <Text style={s.greetingTitle}>
          반가워요, <Text style={s.greetingName}>{displayName}</Text>
        </Text>
        <Text style={s.greetingHeadline}>
          지금 뜨거운 <Text style={s.greetingHot}>마감 임박</Text> 모임 🔥
        </Text>
      </View>

      {hotItems.length === 0 ? (
        <View style={{ paddingHorizontal: pagePaddingH }}>
          <EmptyView
            title="마감 임박 모임이 없어요"
            description="여유있게 모임을 둘러보세요!"
            style={s.hotEmpty}
          />
        </View>
      ) : (
        <FlatList
          data={hotItems}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(it) => String(it.id || it.meetingId)}
          renderItem={({ item }) => <HotCardItem item={item} onPress={onPressHot} t={t} s={s} />}
          // 왜 paddingVertical을 주는가:
          // - 카드 shadow/elevation이 리스트 상/하단에서 잘리는 현상을 방지
          contentContainerStyle={[s.hotListContainer, { paddingHorizontal: pagePaddingH }]}
          style={s.overflowVisible}
          ItemSeparatorComponent={() => <View style={s.hotGap} />}
          decelerationRate="fast"
          snapToInterval={HOT_CARD_WIDTH + HOT_CARD_GAP}
          snapToAlignment="start"
          removeClippedSubviews={false} // 핫 리스트는 아이템 수가 적어 비용 낮고, 클리핑 이슈 예방이 더 큼
        />
      )}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const t = useAppTheme();
  const s = useMemo(() => createStyles(t), [t]);

  const router = useRouter();
  const nickname = useAuthStore((st) => st.user?.nickname);
  const displayName = nickname?.trim() || "회원님";

  // States
  const [cat, setCat] = useState<CategoryKey | "ALL">("ALL");
  const [items, setItems] = useState<MeetingPost[]>([]);
  const [hotItems, setHotItems] = useState<HotMeetingItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtering, setFiltering] = useState(false); // 로직 유지를 위해 state는 남겨둠

  // Refs
  const listRef = useRef<RNSectionList<MeetingPost> | null>(null);
  const requestSeqRef = useRef(0);
  const cacheRef = useRef(new Map<CategoryKey | "ALL", MeetingPost[]>());
  const lastFocusFetchAtRef = useRef(0);

  const pagePaddingH = t.spacing.pagePaddingH;

  // Fetch Logic
  const fetchData = useCallback(async (kind: FetchKind, targetCat: CategoryKey | "ALL") => {
    const seq = ++requestSeqRef.current;

    if (kind === "initial") setLoading(true);
    if (kind === "refresh") setRefreshing(true);
    if (kind === "filter") setFiltering(true);

    try {
      // 1) 일반 목록
      const listPromise = meetingApi
        .listMeetings(targetCat === "ALL" ? undefined : { category: targetCat })
        .catch(() => []);

      // 2) 핫 모임(초기/리프레시만)
      const hotPromise =
        kind !== "filter"
          ? meetingApi.listHotMeetings({ limit: 8, withinMinutes: 180 }).catch(() => [])
          : Promise.resolve(null);

      const [data, hotData] = await Promise.all([listPromise, hotPromise]);

      // 화면 필터링
      const visibleData = data.filter(shouldShowInHomeList);

      if (seq === requestSeqRef.current) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        setItems(visibleData);
        cacheRef.current.set(targetCat, visibleData);

        if (hotData) {
          const visibleHot = hotData.filter((h) => {
            const total = h.capacity?.total ?? 0;
            const current = h.capacity?.current ?? 0;
            return !(total > 0 && current >= total);
          });
          setHotItems(visibleHot);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (seq === requestSeqRef.current) {
        setLoading(false);
        setRefreshing(false);
        setFiltering(false);
      }
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchData("initial", "ALL");
  }, [fetchData]);

  // Category Change
  useEffect(() => {
    // 탭 변경 시 상단으로 스크롤(Sticky 헤더 바로 아래)
    try {
      listRef.current?.scrollToLocation({
        sectionIndex: 0,
        itemIndex: 0,
        viewOffset: 100,
        animated: true,
      });
    } catch {}

    const cached = cacheRef.current.get(cat);
    if (cached) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setItems(cached);
    }
    fetchData("filter", cat);
  }, [cat, fetchData]);

  // Refetch on Focus
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastFocusFetchAtRef.current < 2000) return; // 2초 쿨타임
      lastFocusFetchAtRef.current = now;
      fetchData("refresh", cat);
    }, [fetchData, cat])
  );

  // Handlers
  const onRefresh = () => fetchData("refresh", cat);
  const onPressHot = (id: string) => router.push(`/meetings/${id}`);

  const renderMeetingItem = useCallback(
    ({ item }: SectionListRenderItemInfo<MeetingPost>) => (
      <View style={[s.meetingItemWrap, { paddingHorizontal: pagePaddingH }]}>
        <MeetingCard item={item} showStatusPill={false} showJoinBlockedBadge={false} showHostMessage={false} />
      </View>
    ),
    [pagePaddingH, s.meetingItemWrap]
  );

  const sections = useMemo(() => [{ key: "main", data: items }], [items]);

  const StickyHeader = useMemo(
    () => (
      <View style={s.stickyWrap}>
        {/* CategoryChips 자체가 "하단 라인 + 약한 그림자"를 갖고 있으므로,
            Sticky에서는 레이어 우선순위(zIndex/elevation)만 보강 */}
        <CategoryChips
          value={cat}
          onChange={setCat}
          contentContainerStyle={{ paddingHorizontal: pagePaddingH }}
          style={s.chipsTight}
        />
      </View>
    ),
    [cat, pagePaddingH, s.stickyWrap, s.chipsTight]
  );

  return (
    <AppLayout padded={false}>
      <TopBar
        logo={{ leftText: "Action", rightText: "Mate", iconName: "flash" }}
        showNoti
        showNotiDot
        onPressNoti={() => router.push("/notifications" as any)}
        showBorder={false}
      />

      <SectionList
        ref={listRef}
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <HomeHeader
            t={t}
            s={s}
            displayName={displayName}
            hotItems={hotItems}
            onPressHot={onPressHot}
            pagePaddingH={pagePaddingH}
          />
        }
        renderSectionHeader={() => StickyHeader}
        stickySectionHeadersEnabled
        renderItem={renderMeetingItem}
        ListEmptyComponent={
          loading && !refreshing ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator size="large" color={t.colors.primary} />
            </View>
          ) : (
            <View style={[s.emptyWrap, { paddingHorizontal: pagePaddingH }]}>
              <EmptyView
                title={cat === "ALL" ? "등록된 모임이 없어요" : "이 카테고리는 아직 조용하네요"}
                description="새로운 모임을 직접 만들어보세요!"
              />
            </View>
          )
        }
        contentContainerStyle={s.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        initialNumToRender={5}
        windowSize={5}
        removeClippedSubviews={Platform.OS === "android"}
      />

      <Fab onPress={() => router.push("/meetings/create")} iconName="add" />
    </AppLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles (theme-driven)
// ─────────────────────────────────────────────────────────────────────────────

function createStyles(t: ReturnType<typeof useAppTheme>) {
  const sp = t.spacing;

  return StyleSheet.create({
    flex1: { flex: 1 },

    // Header
    headerWrap: {
      paddingTop: sp.space[4], // 16
      paddingBottom: sp.space[6], // 24
    },
    greetingWrap: {
      marginBottom: sp.space[4], // 16
    },
    greetingTitle: {
      ...t.typography.titleLarge,
      color: t.colors.textSub,
      marginBottom: sp.space[1], // 4
    },
    greetingName: {
      color: t.colors.textMain,
      fontWeight: "700",
    },
    greetingHeadline: {
      ...t.typography.headlineMedium,
      color: t.colors.textMain,
    },
    greetingHot: {
      color: t.colors.error,
      fontWeight: "800",
    },

    // Hot list
    hotListContainer: {
      paddingVertical: sp.space[2], // 8 (shadow 잘림 방지)
    },
    hotGap: {
      width: HOT_CARD_GAP,
    },
    hotEmpty: {
      paddingVertical: sp.space[5], // 20
      backgroundColor: t.colors.surface,
      borderRadius: sp.radiusMd,
      borderWidth: sp.borderWidth,
      borderColor: t.colors.border,
    },

    // Hot card
    hotCard: {
      // Card 컴포넌트가 그림자/보더/라운드를 통일해서 제공하므로,
      // 여기서는 "사이즈 + 내부 레이아웃"만 지정한다.
      overflow: "visible",
    },
    hotCardContent: {
      flex: 1,
      padding: sp.space[3], // 12 (토큰 기반으로 통일)
    },
    hotBadgeRow: {
      flexDirection: "row",
      marginBottom: sp.space[2], // 8
    },
    hotTitle: {
      ...t.typography.titleMedium,
      color: t.colors.textMain,
      marginBottom: sp.space[1], // 4
    },
    hotLocationRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: sp.space[3], // 12
    },
    hotLocationText: {
      ...t.typography.bodySmall,
      color: t.colors.textSub,
      marginLeft: 2,
      flex: 1,
    },
    hotMetaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    hotMetaLabel: {
      ...t.typography.labelSmall,
      color: t.colors.textSub,
    },
    hotMetaValue: {
      ...t.typography.labelSmall,
      fontWeight: "800",
    },
    hotProgressTrack: {
      height: 4,
      backgroundColor: t.colors.overlay[6],
      borderRadius: 2,
    },
    hotProgressFill: {
      height: "100%",
      borderRadius: 2,
    },

    // Sticky header wrapper
    stickyWrap: {
      backgroundColor: t.colors.background,
      zIndex: 30,
      ...(Platform.OS === "android" ? { elevation: 4 } : null),
    },
    chipsTight: {
      // CategoryChips 내부 기본값이 이미 토큰 기반이라
      // 홈 sticky에서는 간격만 살짝 타이트하게
      paddingVertical: sp.space[2],
    },

    // Meeting list
    meetingItemWrap: {
      marginBottom: sp.space[3], // 12
    },

    // Empty / Loading
    loadingWrap: {
      paddingVertical: sp.space[9], // 40
    },
    emptyWrap: {
      paddingTop: sp.space[9], // 40
    },

    listContent: {
      paddingBottom: 100,
    },

    overflowVisible: {
      overflow: "visible",
    },
  });
}