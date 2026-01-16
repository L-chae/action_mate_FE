import React, { useRef } from "react";
import { ScrollView, Pressable, Text, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { CategoryKey } from "@/features/meetings/types";

type ChipKey = CategoryKey | "ALL";

const WHITE = "#FFFFFF";

const CATEGORY_ICONS: Record<CategoryKey, keyof typeof Ionicons.glyphMap> = {
  SPORTS: "basketball-outline",
  GAMES: "game-controller-outline",
  MEAL: "restaurant-outline",
  STUDY: "book-outline",
  ETC: "ellipsis-horizontal-outline",
};

const ALL_ICON: keyof typeof Ionicons.glyphMap = "apps-outline";

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

  // ✅ 스크롤이 시작되면 탭 선택을 취소하기 위한 플래그
  const draggingRef = useRef(false);
  // ✅ 눌렀던 칩 기억 (onPress가 취소되는 기기에서도 onPressOut은 들어오는 경우가 많음)
  const pendingIdRef = useRef<ChipKey | null>(null);

  // ✅ 카테고리 색(테마 기반)
  const categoryColor = (key: CategoryKey) => {
    switch (key) {
      case "SPORTS":
        return t.colors.info;
      case "GAMES":
        // 보라 계열 raw가 없으니 point로 타협(원하면 colors.ts에 secondary 추가 추천)
        return t.colors.point;
      case "MEAL":
        return t.colors.warning;
      case "STUDY":
        return t.colors.success;
      case "ETC":
      default:
        return t.colors.textSub;
    }
  };

  return (
    <View
      pointerEvents="auto"
      style={[
        styles.container,
        {
          backgroundColor: t.colors.background,
          borderBottomColor: t.colors.border, // ✅ neutral[200] 대신 공용 border
          borderBottomWidth: 1,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="always"
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: t.spacing.pagePaddingH }]}
        onScrollBeginDrag={() => {
          draggingRef.current = true;
          pendingIdRef.current = null;
        }}
        onScrollEndDrag={() => {
          setTimeout(() => {
            draggingRef.current = false;
          }, 0);
        }}
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

          const inactiveIconColor =
            cat.id === "ALL"
              ? t.colors.textSub
              : categoryColor(cat.id as CategoryKey);

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
                if (pendingIdRef.current === cat.id) {
                  onChange(cat.id);
                }
                pendingIdRef.current = null;
              }}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isSelected ? t.colors.primary : t.colors.chipBg, // ✅ chipBg 토큰 사용
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <Ionicons
                name={cat.iconName}
                size={16}
                color={isSelected ? WHITE : inactiveIconColor}
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
    paddingVertical: 12,
    position: "relative",
    zIndex: 1000,
    elevation: 1000,
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
