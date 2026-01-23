import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
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
import type { CategoryKey, HotMeetingItem, MeetingPost } from "@/features/meetings/model/types";

import { useAuthStore } from "@/features/auth/model/authStore";

/**
 * Home 하단 리스트에서 숨길 상태
 * - 요구사항: 참여 종료(ENDED) / 정원 마감(FULL) 은 보이면 안 됨
 */
function shouldHideInHomeList(status: MeetingPost["status"] | undefined) {
  if (!status) return false;
  return status === "FULL" || status === "ENDED";
  // 취소도 숨기려면:
  // return status === "FULL" || status === "ENDED" || status === "CANCELED";
}

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

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);

      try {
        // 1) 일반 목록
        let data: MeetingPost[] = [];
        try {
          data = await meetingApi.listMeetings(cat === "ALL" ? undefined : { category: cat });
        } catch (err) {
          console.warn("게시글 목록 로드 실패:", err);
          data = [];
        }

        // ✅ FULL/ENDED 숨김 (서버가 섞어서 내려줘도 UI에서 차단)
        const visibleData = data.filter((m) => !shouldHideInHomeList(m.status));
        setItems(visibleData);

        // 2) 핫한 모임
        let hot: HotMeetingItem[] = [];
        try {
          hot = await meetingApi.listHotMeetings({ limit: 8, withinMinutes: 180 });
        } catch (err) {
          console.warn("핫한 모임 로드 실패:", err);
          hot = [];
        }
        setHotItems(hot);
      } catch (e) {
        console.error("HomeScreen 전체 로드 에러:", e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [cat]
  );

  // 최초 로드 + 카테고리 변경 시 로드
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ✅ “상세 -> 뒤로가기”로 돌아올 때 즉시 갱신 (포커스 기반)
  // - 의도: Home은 이미 마운트되어 있으므로 focus 시점에 서버 상태(참여/정원 등)를 다시 동기화
  // - 과도한 중복 호출 방지를 위해 짧은 디바운스(예: 800ms) 적용
  const lastFocusFetchAtRef = useRef(0);
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (now - lastFocusFetchAtRef.current < 800) return;
      lastFocusFetchAtRef.current = now;

      // “조용한” 갱신: 전체 로딩 스피너 대신 isRefresh=true로 처리
      fetchData(true);
    }, [fetchData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const isDark = t.mode === "dark";
  const dividerColor = t.colors.divider ?? t.colors.border;
  const trackBg = t.colors.border;
  const stickyBg = t.colors.background;

  const sections = useMemo(() => {
    return [{ key: "meetings", title: "meetings", data: items }];
  }, [items]);

  const ListHeader = useMemo(() => {
    return (
      <View>
        {/* 1) 헤드라인 */}
        <View style={{ paddingHorizontal: t.spacing.pagePaddingH, marginBottom: 16, marginTop: 4 }}>
          <Text style={[t.typography.headlineSmall, { color: t.colors.textMain }]}>
            {displayName}, 지금 참여 가능한{"\n"}
            <Text style={{ color: t.colors.primary }}>마감 임박 모임</Text>이에요!
          </Text>
        </View>

        {/* 2) Hot Items */}
        {hotItems.length === 0 ? (
          <View style={{ paddingHorizontal: t.spacing.pagePaddingH, paddingBottom: 24 }}>
            <EmptyView title="지금 임박한 모임이 없어요" description="조금 뒤에 다시 확인해보세요!" />
          </View>
        ) : (
          <FlatList
            data={hotItems}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(it) => String(it.id || it.meetingId)}
            nestedScrollEnabled={false}
            contentContainerStyle={{
              paddingHorizontal: t.spacing.pagePaddingH,
              paddingBottom: 24,
            }}
            renderItem={({ item }) => {
              const total = Math.max(1, item.capacity?.total ?? 1);
              const current = Math.max(0, item.capacity?.current ?? 0);
              const progress = Math.min(1, current / total);
              const targetId = item.meetingId || item.id;

              return (
                <Card onPress={() => router.push(`/meetings/${targetId}`)} style={styles.hotCard} padded>
                  <Badge label={item.badge} tone="error" size="sm" style={{ marginBottom: 12 }} />

                  <View style={{ gap: 4, marginBottom: 16 }}>
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

                    <View style={[styles.track, { backgroundColor: trackBg }]}>
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
            }}
          />
        )}
      </View>
    );
  }, [t, displayName, hotItems, router, trackBg]);

  const SectionHeader = useMemo(() => {
    return (
      <View
        style={[
          styles.stickyHeader,
          {
            backgroundColor: stickyBg,
            borderBottomColor: dividerColor,
            paddingHorizontal: t.spacing.pagePaddingH,
            ...(Platform.OS === "ios"
              ? { shadowColor: isDark ? "transparent" : "#000", shadowOpacity: isDark ? 0 : 0.03 }
              : {}),
          },
        ]}
      >
        <CategoryChips value={cat} onChange={setCat} />
      </View>
    );
  }, [stickyBg, dividerColor, t.spacing.pagePaddingH, isDark, cat]);

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
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: t.spacing.pagePaddingH }}>
            <MeetingCard item={item} />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        renderSectionHeader={() => SectionHeader}
        stickySectionHeadersEnabled
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          loading && !refreshing ? (
            <View style={{ marginTop: 40 }}>
              <ActivityIndicator size="large" color={t.colors.primary} />
            </View>
          ) : (
            <View style={{ marginTop: 60, paddingHorizontal: t.spacing.pagePaddingH, minHeight: 300 }}>
              <EmptyView
                title="이런, 모임이 없네요"
                description={
                  cat === "ALL"
                    ? "현재 서버 연결 상태가 좋지 않거나,\n등록된 모임이 없습니다."
                    : "이 카테고리에는 아직 모임이 없어요."
                }
              />
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />

      <Fab onPress={() => router.push("/meetings/create")} iconName="add" />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  hotCard: { width: 150, height: 180, marginRight: 12 },
  track: { height: 6, borderRadius: 99, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 99 },
  stickyHeader: {
    paddingVertical: 0,
    borderBottomWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
  },
});
