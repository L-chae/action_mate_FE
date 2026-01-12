import React, { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";

import { Screen } from "~/shared/layout/Screen";
import { useAppTheme } from "~/shared/hooks/useAppTheme";

import { HotQuestCard } from "~/features/meetups/ui/HotQuestCard";
import { CategoryChips, CategoryChipValue } from "~/features/meetups/ui/CategoryChips";
import { QuestCard, QuestCardData } from "~/features/meetups/ui/QuestCard";

import { useMeetupsStore } from "~/features/meetups/store";
import type { Meetup, Category } from "~/features/meetups/types";

// 1차 본용: category -> 아이콘/색 매핑
const CAT_STYLE: Record<string, { iconName: QuestCardData["iconName"]; colorHex: string }> = {
  running: { iconName: "directions-run", colorHex: "#FF6B00" },
  walk: { iconName: "directions-walk", colorHex: "#00C853" },
  climb: { iconName: "terrain", colorHex: "#8D6E63" },
  gym: { iconName: "fitness-center", colorHex: "#7E57C2" },
  etc: { iconName: "sports-tennis", colorHex: "#1E88E5" },
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function timeLabelFromIso(iso: string) {
  const d = new Date(iso);
  const now = new Date();

  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const isTomorrow =
    d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate();

  const hhmm = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

  if (sameDay) return `오늘 ${hhmm}`;
  if (isTomorrow) return `내일 ${hhmm}`;
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())} ${hhmm}`;
}

function meetupToQuestCard(m: Meetup): QuestCardData {
  const style = CAT_STYLE[m.category] ?? CAT_STYLE.etc;

  return {
    id: m.id,
    title: m.title,
    tags: [`#${m.category}`, `#${m.durationMin}분`],
    timeLabel: timeLabelFromIso(m.startsAt),
    locationLabel: m.placeName,
    iconName: style.iconName,
    colorHex: style.colorHex,
    current: m.joinedCount,
    max: m.capacity,
  };
}

export default function HomeScreen() {
  const t = useAppTheme();

  const [category, setCategory] = useState<CategoryChipValue>("all");

  const meetups = useMeetupsStore((s) => s.meetups);
  const joinMeetup = useMeetupsStore((s) => s.joinMeetup);

  const allFeed: QuestCardData[] = useMemo(() => meetups.map(meetupToQuestCard), [meetups]);

  // CategoryChips에는 badminton이 있는데, store Category에는 없을 수 있음 → etc로 치환
  const mapChipToStoreCategory = (chip: CategoryChipValue): Category | "etc" => {
    if (chip === "badminton") return "etc";
    if (chip === "all") return "etc";
    return chip as any;
  };

  const feed = useMemo(() => {
    if (category === "all") return allFeed;
    const c = mapChipToStoreCategory(category);
    return allFeed.filter((x) => x.tags.includes(`#${c}`));
  }, [allFeed, category]);

  // 🔥 마감임박(1차 본): 시작 시간 빠른 것 3개 뽑기
  const hot = useMemo(() => {
    const sorted = [...meetups].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    return sorted.slice(0, 3).map((m) => ({
      id: m.id,
      title: m.title,
      location: m.placeName,
      minutesLeft: Math.max(1, Math.round((new Date(m.startsAt).getTime() - Date.now()) / 60000)),
      progress: Math.min(0.95, Math.max(0.1, m.joinedCount / Math.max(1, m.capacity))),
    }));
  }, [meetups]);

  return (
    <Screen>
      <ScrollView stickyHeaderIndices={[2]} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* 0) 헤더 */}
        <View style={[styles.header, { backgroundColor: t.colors.background }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={[t.typography.bodyMedium, { color: t.colors.textSub }]}>👋 민수님,</Text>
              <Text style={[t.typography.titleLarge, { color: t.colors.textMain, marginTop: 4 }]}>
                오늘 3km 러닝 퀘스트 어때요?
              </Text>
            </View>

            <Pressable style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
              <MaterialIcons name="notifications-none" size={28} color={t.colors.textMain} />
              <View style={styles.dot} />
            </Pressable>
          </View>
        </View>

        {/* 1) 마감임박 섹션 */}
        <View style={{ paddingTop: 4, paddingBottom: 10 }}>
          <View style={{ paddingHorizontal: 16, flexDirection: "row", alignItems: "center" }}>
            <MaterialIcons name="bolt" size={22} color="#F6B100" />
            <Text style={[t.typography.titleMedium, { color: t.colors.textMain, marginLeft: 6 }]}>
              마감 임박 퀘스트
            </Text>
          </View>

          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={hot}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 }}
            renderItem={({ item }) => (
              <HotQuestCard
                title={item.title}
                location={item.location}
                minutesLeft={item.minutesLeft}
                progress={item.progress}
                onPress={() => router.push({ pathname: "/meetups/[meetupId]", params: { meetupId: item.id } })}
              />
            )}
          />
        </View>

        {/* 2) 카테고리 칩 (Sticky) */}
        <View style={{ backgroundColor: t.colors.background }}>
          <CategoryChips value={category} onChange={setCategory} />
        </View>

        {/* 3) 메인 피드 */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 } as any}>
          {feed.map((item) => (
            <QuestCard
              key={item.id}
              data={item}
              onPress={() => router.push({ pathname: "/meetups/[meetupId]", params: { meetupId: item.id } })}
              onJoin={() => joinMeetup(item.id)}
            />
          ))}

          {feed.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: "center" }}>
              <Text style={[t.typography.bodyMedium, { color: t.colors.textSub }]}>
                해당 카테고리 퀘스트가 없어요
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  dot: {
    position: "absolute",
    right: 10,
    top: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E53935",
  },
});
