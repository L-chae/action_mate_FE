import React from "react";
import { ScrollView, Pressable, Text, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { CategoryKey } from "@/features/meetings/types";

type ChipKey = CategoryKey | "ALL";

// ✅ MapScreen과 통일: 카테고리별 색상
const CATEGORY_COLORS: Record<CategoryKey, string> = {
  SPORTS: "#4A90E2",
  GAMES: "#9B59B6",
  MEAL: "#FF9F43",
  STUDY: "#2ECC71",
  ETC: "#95A5A6",
};

// ✅ MapScreen과 통일: Ionicons 아이콘
const CATEGORY_ICONS: Record<CategoryKey, keyof typeof Ionicons.glyphMap> = {
  SPORTS: "basketball-outline",
  GAMES: "game-controller-outline",
  MEAL: "restaurant-outline",
  STUDY: "book-outline",
  ETC: "ellipsis-horizontal-outline",
};

// ✅ ALL 전용 아이콘(통일감 있게)
const ALL_ICON: keyof typeof Ionicons.glyphMap = "apps-outline";

// ✅ Fix: types.ts의 CategoryKey와 키값 완전 일치
const CATEGORIES: { id: ChipKey; label: string; iconName: keyof typeof Ionicons.glyphMap }[] = [
  { id: "ALL", label: "전체", iconName: ALL_ICON },
  { id: "SPORTS", label: "운동", iconName: CATEGORY_ICONS.SPORTS },
  { id: "GAMES", label: "오락/게임", iconName: CATEGORY_ICONS.GAMES },
  { id: "MEAL", label: "식사/카페", iconName: CATEGORY_ICONS.MEAL },
  { id: "STUDY", label: "스터디", iconName: CATEGORY_ICONS.STUDY },
  { id: "ETC", label: "기타", iconName: CATEGORY_ICONS.ETC },
];

type Props = {
  value: ChipKey;
  onChange: (val: ChipKey) => void;
};

export default function CategoryChips({ value, onChange }: Props) {
  const t = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: t.colors.background,
          borderBottomColor: t.colors.neutral[200],
          borderBottomWidth: 1,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: t.spacing.pagePaddingH }]}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = value === cat.id;

          // ✅ 비선택 상태에서 아이콘 색을 “카테고리 컬러”로 (ALL은 textSub)
          const inactiveIconColor =
            cat.id === "ALL"
              ? t.colors.textSub
              : CATEGORY_COLORS[cat.id as CategoryKey] ?? t.colors.textSub;

          return (
            <Pressable
              key={cat.id}
              onPress={() => onChange(cat.id)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isSelected ? t.colors.primary : t.colors.neutral[100],
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons
                name={cat.iconName}
                size={16}
                color={isSelected ? "#FFFFFF" : inactiveIconColor}
                style={{ marginRight: 6 }}
              />

              <Text
                style={[
                  t.typography.labelMedium,
                  {
                    color: isSelected ? "#FFFFFF" : t.colors.textSub,
                    fontWeight: isSelected ? "700" : "500",
                  },
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  scrollContent: {
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
