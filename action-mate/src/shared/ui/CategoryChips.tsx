// src/shared/ui/CategoryChips.tsx

import React, { useCallback, useMemo, useRef } from "react";
// ✅ 바텀시트 내부 스크롤 충돌 방지를 위해 gesture-handler 사용
import { ScrollView } from "react-native-gesture-handler";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, Text, StyleSheet, View, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import type { CategoryKey } from "@/features/meetings/model/types";

// 타입을 export해야 다른 곳에서 import해서 쓸 수 있습니다.
export type ChipKey = CategoryKey | "ALL";

type IconName = keyof typeof Ionicons.glyphMap;

const CATEGORY_ICONS: Record<CategoryKey, IconName> = {
  운동: "basketball",
  오락: "game-controller",
  식사: "restaurant",
  자유: "chatbubble-ellipses",
};

const ALL_ICON: IconName = "apps";

const CATEGORIES: { id: ChipKey; label: string; iconName: IconName }[] = [
  { id: "ALL", label: "전체", iconName: ALL_ICON },
  { id: "운동", label: "운동", iconName: CATEGORY_ICONS["운동"] },
  { id: "오락", label: "오락", iconName: CATEGORY_ICONS["오락"] },
  { id: "식사", label: "식사", iconName: CATEGORY_ICONS["식사"] },
  { id: "자유", label: "자유", iconName: CATEGORY_ICONS["자유"] },
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

  /**
   * 외부에서 padding/배경 등을 제어하고 싶을 때 사용
   * - Home sticky bar에서는 paddingVertical을 줄여 하단 공백을 줄이는 데 사용 가능
   */
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export default function CategoryChips({
  value,
  onChange,
  mode = "filter",
  style,
  contentContainerStyle,
}: Props) {
  const t = useAppTheme();

  const white = t.colors?.surface ?? "#FFFFFF";
  const pagePaddingH = t.spacing?.pagePaddingH ?? 16;
  const padV = t.spacing?.space?.[2] ?? 8;
  const gap = t.spacing?.space?.[2] ?? 8;

  // 스크롤 중 탭 오인식 방지
  const draggingRef = useRef(false);
  const lastDragAtRef = useRef(0);

  const visibleCategories = useMemo(() => {
    if (mode === "select") return CATEGORIES.filter((c) => c.id !== "ALL");
    return CATEGORIES;
  }, [mode]);

  const markDragging = useCallback(() => {
    draggingRef.current = true;
    lastDragAtRef.current = Date.now();
  }, []);

  const clearDragging = useCallback(() => {
    requestAnimationFrame(() => {
      draggingRef.current = false;
      lastDragAtRef.current = Date.now();
    });
  }, []);

  const shouldIgnoreTap = useCallback(() => {
    const now = Date.now();
    return draggingRef.current || now - lastDragAtRef.current < 80;
  }, []);

  const handlePress = useCallback(
    (id: ChipKey) => {
      if (shouldIgnoreTap()) return;
      onChange(id);
    },
    [onChange, shouldIgnoreTap],
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: t.colors.background,
          borderBottomColor: t.colors.border,
          paddingVertical: padV,
        },
        style,
      ]}
      collapsable={false}
      pointerEvents="auto"
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled
        keyboardShouldPersistTaps="always"
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: pagePaddingH,
            gap,
          },
          contentContainerStyle,
        ]}
        onScrollBeginDrag={markDragging}
        onScrollEndDrag={clearDragging}
        onMomentumScrollBegin={markDragging}
        onMomentumScrollEnd={clearDragging}
        scrollEventThrottle={16}
      >
        {visibleCategories.map((cat) => {
          const isSelected = value === cat.id;

          return (
            <Pressable
              key={cat.id}
              hitSlop={10}
              pressRetentionOffset={20}
              android_disableSound
              onPress={() => handlePress(cat.id)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isSelected ? t.colors.primary : t.colors.chipBg,
                  borderColor: isSelected ? "transparent" : t.colors.border,
                  borderWidth: isSelected ? 0 : StyleSheet.hairlineWidth,
                  opacity: pressed ? 0.9 : 1,
                  ...(Platform.OS === "android" ? { elevation: isSelected ? 1 : 0 } : null),
                },
              ]}
            >
              <Ionicons
                name={cat.iconName}
                size={16}
                color={isSelected ? white : t.colors.icon.muted}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  t.typography.labelMedium,
                  {
                    color: isSelected ? white : t.colors.textSub,
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
    borderBottomWidth: StyleSheet.hairlineWidth,

    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  scrollContent: {
    paddingRight: 12,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
});