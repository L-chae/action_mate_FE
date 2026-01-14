import React from "react";
import { ScrollView, Pressable, Text, StyleSheet, View } from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { CategoryKey } from "../types";

// ✅ Fix: types.ts의 CategoryKey와 토씨 하나 안 틀리고 똑같아야 합니다.
const CATEGORIES: { id: CategoryKey | "ALL"; label: string; icon: string }[] = [
  { id: "ALL", label: "전체", icon: "✨" },
  { id: "SPORTS", label: "운동", icon: "🏸" },
  { id: "GAMES", label: "오락/게임", icon: "🎲" }, 
  { id: "MEAL", label: "식사/카페", icon: "🍜" },  
  { id: "STUDY", label: "스터디", icon: "📚" },
  { id: "ETC", label: "기타", icon: "🎸" },
];

type Props = {
  value: CategoryKey | "ALL";
  onChange: (val: CategoryKey | "ALL") => void;
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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: t.spacing.pagePaddingH }
        ]}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = value === cat.id;
          return (
            <Pressable
              key={cat.id}
              // ✅ 타입이 정확히 일치하므로 에러가 사라집니다.
              onPress={() => onChange(cat.id)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isSelected ? t.colors.primary : t.colors.neutral[100],
                  opacity: pressed ? 0.8 : 1, 
                },
              ]}
            >
              <Text
                style={[
                  t.typography.labelMedium,
                  {
                    color: isSelected ? "#FFFFFF" : t.colors.textSub,
                    fontWeight: isSelected ? "700" : "500",
                  },
                ]}
              >
                {cat.icon} {cat.label}
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