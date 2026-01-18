// src/shared/ui/CategoryChips.tsx
import React, { useRef } from "react";
import { ScrollView, Pressable, Text, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { CategoryKey } from "@/features/meetings/model/types";

type ChipKey = CategoryKey | "ALL";
const WHITE = "#FFFFFF";

const CATEGORY_ICONS: Record<CategoryKey, keyof typeof Ionicons.glyphMap> = {
  SPORTS: "basketball",
  GAMES: "game-controller",
  MEAL: "restaurant",
  STUDY: "book",
  ETC: "ellipsis-horizontal-circle",
};
const ALL_ICON: keyof typeof Ionicons.glyphMap = "apps";

const CATEGORIES: { id: ChipKey; label: string; iconName: keyof typeof Ionicons.glyphMap }[] = [
  { id: "ALL", label: "전체", iconName: ALL_ICON },
  { id: "SPORTS", label: "운동", iconName: CATEGORY_ICONS.SPORTS },
  { id: "GAMES", label: "오락/게임", iconName: CATEGORY_ICONS.GAMES },
  { id: "MEAL", label: "식사/카페", iconName: CATEGORY_ICONS.MEAL },
  { id: "STUDY", label: "스터디", iconName: CATEGORY_ICONS.STUDY },
  { id: "ETC", label: "기타", iconName: CATEGORY_ICONS.ETC },
];

type Props = { value: ChipKey; onChange: (val: ChipKey) => void };

export default function CategoryChips({ value, onChange }: Props) {
  const t = useAppTheme();
  const draggingRef = useRef(false);
  const pendingIdRef = useRef<ChipKey | null>(null);

  // ✅ 미선택 아이콘은 항상 회색
  const iconGray = t.colors.icon.muted;

  return (
    <View
      pointerEvents="auto"
      style={[
        styles.container,
        {
          backgroundColor: t.colors.background,
          borderBottomColor: t.colors.border,
          paddingVertical: t.spacing.space[3], // 12
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="always"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: t.spacing.pagePaddingH,
            gap: t.spacing.space[2], // 8
          },
        ]}
        onScrollBeginDrag={() => {
          draggingRef.current = true;
          pendingIdRef.current = null;
        }}
        onScrollEndDrag={() => setTimeout(() => (draggingRef.current = false), 0)}
        onMomentumScrollBegin={() => {
          draggingRef.current = true;
          pendingIdRef.current = null;
        }}
        onMomentumScrollEnd={() => {
          draggingRef.current = false;
        }}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = value === cat.id;

          return (
            <Pressable
              key={cat.id}
              hitSlop={8}
              pressRetentionOffset={20}
              onPressIn={() => {
                pendingIdRef.current = cat.id;
              }}
              onPressOut={() => {
                if (draggingRef.current) {
                  pendingIdRef.current = null;
                  return;
                }
                if (pendingIdRef.current === cat.id) onChange(cat.id);
                pendingIdRef.current = null;
              }}
              style={({ pressed }) => [
                styles.miniChip,
                {
                  backgroundColor: isSelected ? t.colors.primary : t.colors.chipBg,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <Ionicons
                name={cat.iconName}
                size={16}
                color={isSelected ? WHITE : iconGray}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  t.typography.labelMedium,
                  {
                    color: isSelected ? WHITE : t.colors.textSub,
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
    position: "relative",
    zIndex: 20,
    // ✅ Android 그림자 약하게
    elevation: 0,

    // ✅ iOS 그림자 아주 연하게
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  scrollContent: {
    paddingRight: 16,
  },

  miniChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
});
