import React, { useEffect, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
import { useRouter } from "expo-router";

import AppLayout from "../../shared/ui/AppLayout";
import { Card } from "../../shared/ui/Card";
import { Fab } from "../../shared/ui/Fab";
import { useAppTheme } from "../../shared/hooks/useAppTheme";

import CategoryChips from "../meetings/components/CategoryChips";
import MeetingCard from "../meetings/components/MeetingCard";
import { listMeetings } from "../meetings/meetingService";
import type { CategoryKey, MeetingPost } from "../meetings/types";

const HOT = [
  { id: "h1", meetingId: "1", badge: "⚡ 35분 뒤", title: "치맥 러닝", place: "잠원지구", progress: 0.8 },
  { id: "h2", meetingId: "3", badge: "⚡ 50분 뒤", title: "보드게임", place: "성수", progress: 0.55 },
  { id: "h3", meetingId: "2", badge: "⚡ 1시간 뒤", title: "라멘", place: "홍대", progress: 0.7 },
];

export default function HomeScreen() {
  const t = useAppTheme();
  const router = useRouter();

  const [cat, setCat] = useState<CategoryKey | "ALL">("ALL");
  const [items, setItems] = useState<MeetingPost[]>([]);

  useEffect(() => {
    listMeetings({ category: cat }).then(setItems);
  }, [cat]);

  return (
    <AppLayout padded={false} style={{ backgroundColor: t.colors.background }}>
      {/* ✅ stickyHeaderIndices: 카테고리 바 위치로 지정 */}
      <ScrollView
        stickyHeaderIndices={[3]}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 0) 헤더 */}
        <View style={[styles.header, { paddingHorizontal: t.spacing.pagePaddingH }]}>
          <View style={{ flex: 1 }}>
            <Text style={[t.typography.bodyMedium, { color: t.colors.textSub }]}>👋 민수님,</Text>
            <Text style={[t.typography.headlineSmall, { marginTop: 4 }]}>오늘 근처 모임 어때요?</Text>
          </View>

          <Pressable
            onPress={() => Alert.alert("알림", "나중에 연결")}
            style={({ pressed }) => [
              styles.notiBtn,
              { backgroundColor: t.colors.surface, borderColor: t.colors.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={{ fontSize: 18 }}>🔔</Text>
            <View style={styles.notiDot} />
          </Pressable>
        </View>

        {/* 1) 마감임박 타이틀 */}
        <View style={[styles.sectionTitle, { paddingHorizontal: t.spacing.pagePaddingH }]}>
          <Text style={{ fontSize: 18 }}>⚡</Text>
          <Text style={t.typography.titleMedium}>마감 임박</Text>
        </View>

        {/* 2) 마감임박 가로 카드 (✅ 이제 sticky 아님, 스크롤하면 같이 올라감) */}
        <FlatList
          data={HOT}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ paddingHorizontal: t.spacing.pagePaddingH, paddingBottom: 8 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/meetings/${item.meetingId}`)} // ✅ 상세 이동
              style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
            >
              <Card style={[styles.hotCard, { padding: 0, borderColor: `${t.colors.error}55` }]}>
                <View style={[styles.hotBadge, { backgroundColor: t.colors.error }]}>
                  <Text style={[t.typography.labelSmall, { color: "#fff" }]}>{item.badge}</Text>
                </View>

                <View style={{ padding: 12, gap: 4 }}>
                  <Text style={t.typography.titleSmall}>{item.title}</Text>
                  <Text style={[t.typography.bodySmall, { color: t.colors.textSub }]}>{item.place}</Text>
                </View>

                <View style={{ flex: 1 }} />

                <View style={{ padding: 12 }}>
                  <View style={[styles.track, { backgroundColor: t.colors.border }]}>
                    <View
                      style={[
                        styles.fill,
                        { width: `${Math.round(item.progress * 100)}%`, backgroundColor: t.colors.error },
                      ]}
                    />
                  </View>
                </View>
              </Card>
            </Pressable>
          )}
        />

        {/* 3) ✅ 카테고리 바(여기만 sticky) */}
        <View style={{ backgroundColor: t.colors.background }}>
          <CategoryChips value={cat} onChange={setCat} />
        </View>

        {/* 4) 리스트 */}
        <View style={{ padding: t.spacing.pagePaddingH, gap: 12 }}>
          {items.map((m) => (
            <MeetingCard key={m.id} item={m} />
          ))}
        </View>
      </ScrollView>

      <Fab onPress={() => Alert.alert("모임 만들기", "나중에 연결")} />
    </AppLayout>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 8, paddingBottom: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  notiBtn: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  notiDot: { position: "absolute", right: 12, top: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF3B30" },

  sectionTitle: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 },

  hotCard: { width: 140, height: 160, marginRight: 12 },
  hotBadge: { paddingHorizontal: 8, paddingVertical: 4, borderTopLeftRadius: 16, borderBottomRightRadius: 10, alignSelf: "flex-start" },

  track: { height: 4, borderRadius: 999, overflow: "hidden" },
  fill: { height: 4, borderRadius: 999 },
});
