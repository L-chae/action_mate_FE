// HomeScreen.tsx
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
import { listHotMeetings, listMeetings } from "../meetings/api/meetingService";
import type { CategoryKey, MeetingPost } from "../meetings/model/meeting.types";
import type { HotMeetingItem } from "../meetings/api/meetingService";

export default function HomeScreen() {
  const t = useAppTheme();
  const router = useRouter();

  const [cat, setCat] = useState<CategoryKey | "ALL">("ALL");
  const [items, setItems] = useState<MeetingPost[]>([]);
  const [hotItems, setHotItems] = useState<HotMeetingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [data, hot] = await Promise.all([
        listMeetings(cat === "ALL" ? undefined : { category: cat }),
        listHotMeetings({ limit: 8, withinMinutes: 180 }),
      ]);
      setItems(data);
      setHotItems(hot);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cat]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const isDark = t.mode === "dark";

  // ✅ 다크모드에서 트랙/디바이더/스티키 그림자 안정화
  const dividerColor = t.colors.divider ?? t.colors.border;
  const trackBg = t.colors.border; // neutral[200] 대신 border가 훨씬 안전
  const stickyBg = t.colors.background; // 칩 영역은 배경과 동일

  return (
    <AppLayout padded={false}>
      <TopBar
        logo={{ leftText: "Action", rightText: "Mate", iconName: "flash" }}
        showNoti
        showNotiDot
        showMenu
        showBorder
      />

      <ScrollView
        stickyHeaderIndices={[2]}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.colors.primary}
            colors={[t.colors.primary]}
            progressBackgroundColor={t.colors.background}
          />
        }
      >
        {/* 1) 헤드라인 */}
        <View style={{ paddingHorizontal: t.spacing.pagePaddingH, marginBottom: 16, marginTop: 4 }}>
          <Text style={[t.typography.headlineSmall, { color: t.colors.textMain }]}>
            민수님, 지금 참여 가능한{"\n"}
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
            keyExtractor={(it) => it.id}
            nestedScrollEnabled
            contentContainerStyle={{
              paddingHorizontal: t.spacing.pagePaddingH,
              paddingBottom: 24,
            }}
            renderItem={({ item }) => {
              const progress = item.capacityJoined / item.capacityTotal;

              return (
                <Card
                  onPress={() => router.push(`/meetings/${item.meetingId}`)}
                  style={styles.hotCard}
                  padded
                >
                  <Badge label={item.badge} tone="error" size="sm" style={{ marginBottom: 12 }} />

                  <View style={{ gap: 4, marginBottom: 16 }}>
                    <Text style={[t.typography.titleMedium, { color: t.colors.textMain }]} numberOfLines={1}>
                      {item.title}
                    </Text>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name="location-outline" size={14} color={t.colors.textSub} />
                      <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]} numberOfLines={1}>
                        {item.place}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flex: 1 }} />

                  <View>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                      <Text style={[t.typography.labelSmall, { color: t.colors.textSub }]}>참여 인원</Text>
                      <Text style={[t.typography.labelSmall, { color: t.colors.primary }]}>
                        {item.capacityJoined}/{item.capacityTotal}
                      </Text>
                    </View>

                    <View style={[styles.track, { backgroundColor: trackBg }]}>
                      <View
                        style={[
                          styles.fill,
                          {
                            width: `${Math.round(progress * 100)}%`,
                            backgroundColor: t.colors.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </Card>
              );
            }}
          />
        )}

        {/* 3) Sticky Header */}
        <View
          style={[
            styles.stickyHeader,
            {
              backgroundColor: stickyBg,
              borderBottomColor: dividerColor,
              // ✅ 다크에서 검정 그림자(#000) 고정 제거
              ...(Platform.OS === "ios"
                ? {
                    shadowColor: isDark ? "transparent" : "#000",
                    shadowOpacity: isDark ? 0 : 0.03,
                  }
                : {}),
            },
          ]}
        >
          <CategoryChips value={cat} onChange={setCat} />
        </View>

        {/* 4) 메인 리스트 */}
        <View style={{ paddingHorizontal: t.spacing.pagePaddingH, minHeight: 300 }}>
          {loading ? (
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
                description={"근처에 열린 모임이 없어요. 첫 번째 호스트가 되어보세요!"}
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
  hotCard: {
    width: 150,
    height: 180,
    marginRight: 12,
  },
  track: {
    height: 6,
    borderRadius: 99,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 99,
  },
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