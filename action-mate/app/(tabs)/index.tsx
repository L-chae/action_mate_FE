import React, { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Screen } from "~/shared/layout/Screen";
import { useAppTheme } from "~/shared/hooks/useAppTheme";

import { HotQuestCard } from "~/features/meetups/ui/HotQuestCard";
import { CategoryChips, CategoryChipValue } from "~/features/meetups/ui/CategoryChips";
import { QuestCard, QuestCardData } from "~/features/meetups/ui/QuestCard";

export default function HomeScreen() {
  const t = useAppTheme();

  const [category, setCategory] = useState<CategoryChipValue>("all");

  // ✅ Flutter 코드의 questData 느낌 그대로 (나중에 store meetups로 교체)
  const allFeed: QuestCardData[] = useMemo(
    () => [
      {
        title: "초보 환영! 클라이밍 일일 체험",
        tags: ["#친목", "#초보만", "#뒤풀이X"],
        timeLabel: "오늘 19:00",
        locationLabel: "강남역 3번 출구",
        iconName: "terrain",
        colorHex: "#8D6E63",
        current: 3,
        max: 4,
      },
      {
        title: "한강 공원 5km 가볍게 뛰실 분",
        tags: ["#러닝", "#530페이스"],
        timeLabel: "오늘 20:30",
        locationLabel: "여의도 한강공원",
        iconName: "directions-run",
        colorHex: "#FF6B00",
        current: 2,
        max: 6,
      },
      {
        title: "퇴근 후 배드민턴 내기 한판",
        tags: ["#배드민턴", "#B조이상"],
        timeLabel: "내일 19:00",
        locationLabel: "마곡 실내 배드민턴장",
        iconName: "sports-tennis",
        colorHex: "#1E88E5",
        current: 1,
        max: 4,
      },
      {
        title: "점심 산책 30분만!",
        tags: ["#산책", "#가볍게"],
        timeLabel: "오늘 12:30",
        locationLabel: "테헤란로 공원",
        iconName: "directions-walk",
        colorHex: "#00C853",
        current: 5,
        max: 8,
      },
    ],
    []
  );

  const feed = useMemo(() => {
    if (category === "all") return allFeed;

    // 임시 카테고리 매핑(나중엔 meetup.category로 필터)
    const mapCategory = (item: QuestCardData): CategoryChipValue => {
      if (item.iconName === "directions-run") return "running";
      if (item.iconName === "terrain") return "climb";
      if (item.iconName === "sports-tennis") return "badminton";
      if (item.iconName === "directions-walk") return "walk";
      return "etc";
    };

    return allFeed.filter((x) => mapCategory(x) === category);
  }, [allFeed, category]);

  // 🔥 마감임박 가로 카드 (임시)
  const hot = useMemo(
    () => [
      { title: "치맥 러닝", location: "잠원지구", minutesLeft: 35, progress: 0.8 },
      { title: "점심 산책", location: "역삼 공원", minutesLeft: 25, progress: 0.9 },
      { title: "클라임 한판", location: "클라임짐 A", minutesLeft: 50, progress: 0.6 },
    ],
    []
  );

  // stickyHeaderIndices: ScrollView children 인덱스 기준
  // 0: header, 1: hot section, 2: category chips(Sticky), 3: feed
  return (
    <Screen noPadding>
      <ScrollView stickyHeaderIndices={[2]} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* 0) 헤더 (SliverAppBar 느낌) */}
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
              {/* 빨간 점 */}
              <View style={styles.dot} />
            </Pressable>
          </View>
        </View>

        {/* 1) 마감임박 섹션 (가로 리스트) */}
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
            keyExtractor={(item, idx) => `${item.title}-${idx}`}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 }}
            renderItem={({ item }) => (
              <HotQuestCard
                title={item.title}
                location={item.location}
                minutesLeft={item.minutesLeft}
                progress={item.progress}
                onPress={() => {
                  // TODO: 상세 이동 자리
                  // router.push(...)
                }}
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
          {feed.map((item, idx) => (
            <QuestCard
              key={`${item.title}-${idx}`}
              data={item}
              onPress={() => {
                // TODO: 상세 이동
              }}
              onJoin={() => {
                // TODO: 참여 액션 (나중에 store.joinMeetup)
              }}
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
