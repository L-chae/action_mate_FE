// src/shared/ui/MultiCategoryChips.tsx
import React, { useMemo, useRef, useCallback } from "react";
import { ScrollView } from "react-native-gesture-handler";
import { Pressable, Text, StyleSheet, View, type ViewStyle, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { withAlpha } from "@/shared/theme/colors";
import type { CategoryKey } from "@/features/meetings/model/types";

const WHITE = "#FFFFFF";
const ALL_ICON: keyof typeof Ionicons.glyphMap = "apps";

// ⚠️ 프로젝트 CategoryKey 값에 맞춰 조정하세요.
const CATEGORY_ICONS: Partial<Record<CategoryKey, keyof typeof Ionicons.glyphMap>> = {
  SPORTS: "basketball",
  GAMES: "game-controller",
  MEAL: "restaurant",
  STUDY: "book",
  ETC: "ellipsis-horizontal-circle",
};

const CATEGORY_COLORS: Partial<Record<CategoryKey, string>> = {
  SPORTS: "#2E7D32",
  GAMES: "#6A1B9A",
  MEAL: "#EF6C00",
  STUDY: "#1565C0",
  ETC: "#546E7A",
};

type ChipItem = {
  id: "ALL" | CategoryKey;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  color?: string;
};

const BASE_CATEGORIES: ChipItem[] = [
  { id: "SPORTS", label: "운동", iconName: CATEGORY_ICONS.SPORTS ?? ALL_ICON, color: CATEGORY_COLORS.SPORTS },
  { id: "GAMES", label: "오락/게임", iconName: CATEGORY_ICONS.GAMES ?? ALL_ICON, color: CATEGORY_COLORS.GAMES },
  { id: "MEAL", label: "식사/카페", iconName: CATEGORY_ICONS.MEAL ?? ALL_ICON, color: CATEGORY_COLORS.MEAL },
  { id: "STUDY", label: "스터디", iconName: CATEGORY_ICONS.STUDY ?? ALL_ICON, color: CATEGORY_COLORS.STUDY },
  { id: "ETC", label: "기타", iconName: CATEGORY_ICONS.ETC ?? ALL_ICON, color: CATEGORY_COLORS.ETC },
];

type Props = {
  /** 선택된 카테고리들 (filter 모드에서 빈 배열이면 "전체" 의미) */
  value: CategoryKey[];
  onChange: (next: CategoryKey[]) => void;

  /**
   * - filter: 전체 칩 포함 + 빈 배열을 전체로 취급
   * - select: 전체 칩 제외 (멀티 선택 입력용)
   * @default "filter"
   */
  mode?: "filter" | "select";

  /**
   * ✅ 요구사항: 상단 칩 "배경 아예 없음"
   * - container background/border/shadow 모두 제거
   */
  containerStyle?: ViewStyle;

  /** 기타(ETC) 노출 여부 */
  includeEtc?: boolean;

  /** 카테고리별 색상 덮어쓰기 */
  colorOverrides?: Partial<Record<CategoryKey, string>>;
};

export default function MultiCategoryChips({
  value,
  onChange,
  mode = "filter",
  containerStyle,
  includeEtc = true,
  colorOverrides,
}: Props) {
  const t = useAppTheme();

  // ✅ 스크롤 중 탭 오작동 방지
  const draggingRef = useRef(false);
  const pendingIdRef = useRef<string | null>(null);
  const lastDragAtRef = useRef(0);

  const current = value ?? [];
  const isAllSelected = mode === "filter" && current.length === 0;

  const categories = useMemo(() => {
    const base = includeEtc ? BASE_CATEGORIES : BASE_CATEGORIES.filter((c) => c.id !== "ETC");
    if (!colorOverrides) return base;

    // 색상 오버라이드가 있을 때만 새 배열 생성(불필요한 map 방지)
    return base.map((c) => {
      const key = c.id as CategoryKey;
      const override = colorOverrides?.[key];
      return override ? { ...c, color: override } : c;
    });
  }, [includeEtc, colorOverrides]);

  const visible = useMemo(() => {
    if (mode === "select") return categories;
    return [{ id: "ALL", label: "전체", iconName: ALL_ICON }, ...categories] as ChipItem[];
  }, [mode, categories]);

  const markDragging = useCallback(() => {
    draggingRef.current = true;
    pendingIdRef.current = null;
    lastDragAtRef.current = Date.now();
  }, []);

  const clearDraggingSoon = useCallback(() => {
    requestAnimationFrame(() => {
      draggingRef.current = false;
    });
  }, []);

  const shouldIgnoreTap = useCallback(() => {
    const now = Date.now();
    return draggingRef.current || now - lastDragAtRef.current < 80;
  }, []);

  const toggle = useCallback(
    (id: string) => {
      if (mode === "filter" && id === "ALL") {
        onChange([]);
        return;
      }

      const key = id as unknown as CategoryKey;

      if (current.length === 0) {
        onChange([key]);
        return;
      }

      const exists = current.includes(key);
      if (exists) {
        onChange(current.filter((c) => c !== key));
        return;
      }

      onChange([...current, key]);
    },
    [current, mode, onChange]
  );

  // ✅ "배경 아예 없음": 컨테이너는 투명 + 디바이더/그림자 제거
  const pagePad = t.spacing?.pagePaddingH ?? 16;
  const gap = t.spacing?.space?.[2] ?? 8;

  const chipBorderNeutral = withAlpha(t.colors?.border ?? "#000000", t.mode === "dark" ? 0.55 : 0.35);
  const chipBgNeutral = withAlpha(t.colors?.surface ?? "#FFFFFF", t.mode === "dark" ? 0.22 : 0.92);
  const chipBgPressed = withAlpha(t.colors?.overlay?.[6] ?? "#000000", t.mode === "dark" ? 0.22 : 0.06);

  return (
    <View
      style={[
        styles.container,
        {
          paddingVertical: t.spacing?.space?.[2] ?? 8,
        },
        containerStyle,
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
            paddingHorizontal: pagePad,
            gap,
          },
        ]}
        onScrollBeginDrag={markDragging}
        onScrollEndDrag={clearDraggingSoon}
        onMomentumScrollBegin={markDragging}
        onMomentumScrollEnd={() => {
          draggingRef.current = false;
          lastDragAtRef.current = Date.now();
        }}
        scrollEventThrottle={16}
      >
        {visible.map((cat) => {
          const selected =
            mode === "filter" && cat.id === "ALL" ? isAllSelected : current.includes(cat.id as CategoryKey);

          const baseColor =
            cat.id === "ALL"
              ? (t.colors?.textMain ?? "#111111")
              : cat.color ?? (t.colors?.primary ?? "#1565C0");

          // ✅ 배경 없음 + 이질감 최소화:
          // - 비선택: surface tint(아주 약하게) + 중립 보더
          // - 선택: 컬러 채움(고정) + 보더 제거
          const bg = selected ? baseColor : chipBgNeutral;
          const borderColor = selected ? "transparent" : withAlpha(baseColor, 0.22) || chipBorderNeutral;

          const textColor = selected ? WHITE : baseColor;
          const iconColor = selected ? WHITE : baseColor;

          return (
            <Pressable
              key={String(cat.id)}
              accessibilityRole="button"
              hitSlop={10}
              pressRetentionOffset={20}
              android_disableSound
              onPressIn={() => {
                pendingIdRef.current = String(cat.id);
              }}
              onPressOut={() => {
                if (pendingIdRef.current !== String(cat.id)) return;

                if (shouldIgnoreTap()) {
                  pendingIdRef.current = null;
                  return;
                }

                toggle(String(cat.id));
                pendingIdRef.current = null;
              }}
              android_ripple={
                Platform.OS === "android" ? { color: withAlpha("#000000", 0.06), borderless: false } : undefined
              }
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: pressed && !selected ? chipBgPressed : bg,
                  borderColor,
                  borderWidth: selected ? 0 : StyleSheet.hairlineWidth,
                  opacity: pressed ? 0.94 : 1,
                },
                selected ? styles.chipSelectedShadow : styles.chipShadow,
                Platform.OS === "android" ? (selected ? styles.androidSelectedElevation : null) : null,
              ]}
            >
              <Ionicons name={cat.iconName} size={16} color={iconColor} style={styles.iconLeft} />
              <Text
                style={[
                  t.typography?.labelMedium ?? { fontSize: 13 },
                  { color: textColor, fontWeight: selected ? "700" : "600" },
                ]}
              >
                {cat.label}
              </Text>
              {selected && cat.id !== "ALL" ? (
                <Ionicons name="checkmark" size={16} color={WHITE} style={styles.iconRight} />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // ✅ 컨테이너 배경/보더/그림자 "완전 제거"
  container: {
    position: "relative",
    zIndex: 20,
    backgroundColor: "transparent",
    borderBottomWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
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
    minHeight: 40,
    borderRadius: 999,
  },
  chipShadow: {
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  chipSelectedShadow: {
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  androidSelectedElevation: {
    elevation: 2,
  },
  iconLeft: { marginRight: 6 },
  iconRight: { marginLeft: 6, opacity: 0.95 },
});

/*
요약: 컨테이너 배경/보더/그림자를 완전히 제거해 지도 위에서 이질감 없이 “떠있는 칩”만 보이게 했습니다.
요약: colorOverrides가 없으면 map을 생략하고, toggle/drag 핸들러를 useCallback으로 고정해 불필요한 재생성을 줄였습니다.
요약: 비선택 칩은 surface tint+얇은 보더로만 구분하고, 선택 칩만 컬러 채움으로 강조해 가독성을 유지합니다.
*/
