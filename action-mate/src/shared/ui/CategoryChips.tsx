import React, { useRef } from "react";
import { ScrollView, Pressable, Text, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { CategoryKey } from "@/features/meetings/types";

type ChipKey = CategoryKey | "ALL";

const CATEGORY_COLORS: Record<CategoryKey, string> = {
  SPORTS: "#4A90E2",
  GAMES: "#9B59B6",
  MEAL: "#FF9F43",
  STUDY: "#2ECC71",
  ETC: "#95A5A6",
};

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

  return (
    <View
      pointerEvents="auto"
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
        nestedScrollEnabled
        keyboardShouldPersistTaps="always"
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: t.spacing.pagePaddingH },
        ]}
        onScrollBeginDrag={() => {
          draggingRef.current = true;
          pendingIdRef.current = null;
        }}
        onScrollEndDrag={() => {
          // 드래그 끝난 뒤 바로 탭 인정되도록 한 틱 뒤에 해제
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
              : CATEGORY_COLORS[cat.id as CategoryKey] ?? t.colors.textSub;

          return (
            <Pressable
              key={cat.id}
              hitSlop={8}
              pressRetentionOffset={20}
              onPressIn={() => {
                pendingIdRef.current = cat.id;
              }}
              onPressOut={() => {
                // ✅ 스크롤 중이면 선택 금지
                if (draggingRef.current) {
                  pendingIdRef.current = null;
                  return;
                }

                // ✅ 눌렀던 칩이면 선택 확정 (onPress가 취소돼도 동작)
                if (pendingIdRef.current === cat.id) {
                  onChange(cat.id);
                }
                pendingIdRef.current = null;
              }}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isSelected ? t.colors.primary : t.colors.neutral[100],
                  opacity: pressed ? 0.88 : 1,
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

    // ✅ sticky 환경에서 터치 안정화
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