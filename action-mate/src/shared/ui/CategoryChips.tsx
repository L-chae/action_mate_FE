import React, { useMemo, useRef } from "react";
// ✅ 바텀시트 내부 스크롤 충돌 방지를 위해 gesture-handler 사용
import { ScrollView } from "react-native-gesture-handler";
import { Pressable, Text, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { CategoryKey } from "@/features/meetings/model/types";

// 타입을 export해야 다른 곳에서 import해서 쓸 수 있습니다.
export type ChipKey = CategoryKey | "ALL";

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

type Props = {
  value: ChipKey;
  onChange: (val: ChipKey) => void;
  /**
   * - filter: 지도/목록 조회용 (전체 포함)
   * - select: 생성/입력용 (전체 제외)
   * @default "filter"
   */
  mode?: "filter" | "select";
};

export default function CategoryChips({ value, onChange, mode = "filter" }: Props) {
  const t = useAppTheme();
  
  // 스크롤 중 클릭 방지를 위한 Refs
  const draggingRef = useRef(false);
  const pendingIdRef = useRef<ChipKey | null>(null);

  // ✅ 모드에 따라 '전체' 칩 포함 여부 결정
  const visibleCategories = useMemo(() => {
    if (mode === "select") {
      return CATEGORIES.filter((c) => c.id !== "ALL");
    }
    return CATEGORIES;
  }, [mode]);

  return (
    <View
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
        // ✅ 바텀시트 등 중첩 환경 호환
        nestedScrollEnabled
        keyboardShouldPersistTaps="always"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: t.spacing.pagePaddingH,
            gap: t.spacing.space[2], // 8
          },
        ]}
        // 스크롤 제스처 감지 로직
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
        {visibleCategories.map((cat) => {
          const isSelected = value === cat.id;
          const iconColor = isSelected ? WHITE : t.colors.icon.muted;

          return (
            <Pressable
              key={cat.id}
              hitSlop={8}
              pressRetentionOffset={20}
              onPressIn={() => {
                pendingIdRef.current = cat.id;
              }}
              onPressOut={() => {
                // 스크롤 중이었다면 클릭 무시
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
                color={iconColor}
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
    elevation: 0,
    // iOS 그림자 미세 조정
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