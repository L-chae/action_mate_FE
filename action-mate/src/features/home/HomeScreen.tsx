import React, { useEffect, useState, useCallback } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import TopBar from "@/shared/ui/TopBar";
import AppLayout from "@/shared/ui/AppLayout";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Fab } from "@/shared/ui/Fab";
import EmptyView from "@/shared/ui/EmptyView";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

import CategoryChips from "@/shared/ui/CategoryChips";
import { MeetingCard } from "@/features/meetings/ui/MeetingCard";

// ✅ meeting API
import { meetingApi } from "@/features/meetings/api/meetingApi";
import type { CategoryKey, MeetingPost, HotMeetingItem } from "@/features/meetings/model/types";

// ✅ 닉네임 가져오기
import { useAuthStore } from "@/features/auth/model/authStore";

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
        // 1) 일반 목록 조회
        let data: MeetingPost[] = [];
        try {
          data = await meetingApi.listMeetings(cat === "ALL" ? undefined : { category: cat });
        } catch (err) {
          console.warn("게시글 목록 로드 실패:", err);
          data = [];
        }

        // 2) 핫한 모임 조회
        let hot: HotMeetingItem[] = [];
        try {
          hot = await meetingApi.listHotMeetings({ limit: 8, withinMinutes: 180 });
        } catch (err) {
          console.warn("핫한 모임 로드 실패:", err);
          hot = [];
        }

        setItems(data);
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData(true);
  };

  const isDark = t.mode === "dark";
  const dividerColor = t.colors.divider ?? t.colors.border;
  const trackBg = t.colors.border;
  const stickyBg = t.colors.background;

  return (
    <AppLayout padded={false}>
      <TopBar
        logo={{ leftText: "Action", rightText: "Mate", iconName: "flash" }}
        showNoti
        showNotiDot
        onPressNoti={() => router.push("/notifications" as any)}
        showBorder
      />

      <ScrollView
        stickyHeaderIndices={[2]} // 0:헤드라인, 1:HotList, 2:Category(Sticky)
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
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
            nestedScrollEnabled
            contentContainerStyle={{
              paddingHorizontal: t.spacing.pagePaddingH,
              paddingBottom: 24,
            }}
            renderItem={({ item }) => {
              // ✅ 통일 shape: capacity / location
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

        {/* 3) Sticky Header (카테고리) */}
        <View
          style={[
            styles.stickyHeader,
            {
              backgroundColor: stickyBg,
              borderBottomColor: dividerColor,
              ...(Platform.OS === "ios"
                ? { shadowColor: isDark ? "transparent" : "#000", shadowOpacity: isDark ? 0 : 0.03 }
                : {}),
            },
          ]}
        >
          <CategoryChips value={cat} onChange={setCat} />
        </View>

        {/* 4) 메인 리스트 */}
        <View style={{ paddingHorizontal: t.spacing.pagePaddingH, minHeight: 300 }}>
          {loading && !refreshing ? (
            <View style={{ marginTop: 40 }}>
              <ActivityIndicator size="large" color={t.colors.primary} />
            </View>
          ) : items.length > 0 ? (
            <View style={{ gap: 12, paddingTop: 16 }}>
              {items.map((m) => (
                <MeetingCard key={m.id} item={m} />
              ))}
            </View>
          ) : (
            <View style={{ marginTop: 60 }}>
              <EmptyView
                title="이런, 모임이 없네요"
                description={
                  cat === "ALL"
                    ? "현재 서버 연결 상태가 좋지 않거나,\n등록된 모임이 없습니다."
                    : "이 카테고리에는 아직 모임이 없어요."
                }
              />
            </View>
          )}
        </View>
      </ScrollView>

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
    // iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    // Android
    elevation: 1,
  },
});