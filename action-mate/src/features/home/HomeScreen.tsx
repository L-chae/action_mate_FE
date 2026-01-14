import React, { useEffect, useState, useCallback } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// ✅ 공통 UI
import TopBar from "@/shared/ui/TopBar";
import AppLayout from "@/shared/ui/AppLayout";
import { Card } from "@/shared/ui/Card";
import { Badge } from "@/shared/ui/Badge";
import { Fab } from "@/shared/ui/Fab";
import EmptyView from "@/shared/ui/EmptyView";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

// ✅ 도메인 컴포넌트
import CategoryChips from "@/shared/ui/CategoryChips";
import MeetingCard from "../meetings/components/MeetingCard";
import { listMeetings } from "../meetings/meetingService";
import type { CategoryKey, MeetingPost } from "../meetings/types";

// ✅ 더미 데이터 (필드명 통일: capacityJoined/capacityTotal)
const HOT_ITEMS: Array<{
  id: string;
  meetingId: string;
  badge: string;
  title: string;
  place: string;
  capacityJoined: number;
  capacityTotal: number;
}> = [
  {
    id: "h1",
    meetingId: "1",
    badge: "35분 남음",
    title: "한강 치맥 러닝 🏃",
    place: "잠원지구 3주차장",
    capacityJoined: 3,
    capacityTotal: 4,
  },
  {
    id: "h2",
    meetingId: "3",
    badge: "50분 남음",
    title: "보드게임 벙개 🎲",
    place: "성수 앨리스카페",
    capacityJoined: 2,
    capacityTotal: 4,
  },
  {
    id: "h3",
    meetingId: "2",
    badge: "1시간 남음",
    title: "퇴근길 라멘 🍜",
    place: "홍대 입구역",
    capacityJoined: 3,
    capacityTotal: 6,
  },
];

export default function HomeScreen() {
  const t = useAppTheme();
  const router = useRouter();

  const [cat, setCat] = useState<CategoryKey | "ALL">("ALL");
  const [items, setItems] = useState<MeetingPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ 핵심 수정:
  // - {} / as any 제거
  // - listMeetings를 "ALL이면 params 생략" 형태로 호출
  const fetchData = useCallback(async () => {
    try {
      const data = await listMeetings(cat === "ALL" ? undefined : { category: cat });
      setItems(data);
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

  return (
    <AppLayout padded={false}>
<TopBar
  logo={{ leftText: "Action", rightText: "Mate", iconName: "flash" }}
  showNoti
  showNotiDot
  showMenu
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
          />
        }
      >
        {/* 1) 헤드라인 */}
        <View style={{ paddingHorizontal: t.spacing.pagePaddingH, marginBottom: 16, marginTop: 4 }}>
          <Text style={[t.typography.headlineSmall, { color: t.colors.textMain }]}>
            민수님, 지금 참여 가능한{"\n"}
            <Text style={{ color: t.colors.primary}}>마감 임박 모임</Text>이에요!
          </Text>
        </View>

        {/* 2) Hot Items */}
        <FlatList
          data={HOT_ITEMS}
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
                  <Text style={[t.typography.titleMedium]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="location-outline" size={14} color={t.colors.textSub} />
                    <Text style={[t.typography.bodySmall]} numberOfLines={1}>
                      {item.place}
                    </Text>
                  </View>
                </View>

                <View style={{ flex: 1 }} />

                <View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text style={t.typography.labelSmall}>참여 인원</Text>
                    <Text style={[t.typography.labelSmall, { color: t.colors.primary }]}>
                      {item.capacityJoined}/{item.capacityTotal}
                    </Text>
                  </View>

                  <View style={[styles.track, { backgroundColor: t.colors.neutral[200] }]}>
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

        {/* 3) Sticky Header */}
        <View
          style={[
            styles.stickyHeader,
            {
              backgroundColor: t.colors.background,
              borderBottomColor: t.colors.neutral[200],
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
  },
});