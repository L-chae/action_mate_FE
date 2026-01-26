// src/shared/ui/MultiCategoryChips.tsx
import React, { useMemo, useRef } from "react";
import { ScrollView } from "react-native-gesture-handler";
import { Pressable, Text, StyleSheet, View, ViewStyle, Platform } from "react-native";
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

  /** NOTE: 이제 컨테이너는 항상 '흰색(불투명)'로 렌더됩니다. */
  transparentBackground?: boolean;

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

  const draggingRef = useRef(false);
  const pendingIdRef = useRef<string | null>(null);
  const lastDragAtRef = useRef(0);

  const isAllSelected = mode === "filter" && (value?.length ?? 0) === 0;

  const categories = useMemo(() => {
    const base = includeEtc ? BASE_CATEGORIES : BASE_CATEGORIES.filter((c) => c.id !== "ETC");
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

  const markDragging = () => {
    draggingRef.current = true;
    pendingIdRef.current = null;
    lastDragAtRef.current = Date.now();
  };

  const clearDraggingSoon = () => {
    requestAnimationFrame(() => {
      draggingRef.current = false;
    });
  };

  const shouldIgnoreTap = () => {
    const now = Date.now();
    return draggingRef.current || now - lastDragAtRef.current < 80;
  };

  const toggle = (id: string) => {
    if (mode === "filter" && id === "ALL") {
      onChange([]);
      return;
    }

    const key = id as unknown as CategoryKey;
    const current = value ?? [];

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
  };

  // ✅ 요구사항: "배경 없애고 흰색 컨테이너" => 컨테이너만 흰색(불투명), 외곽 카드감 제거
  const containerBg = "#FFFFFF";
  const divider = withAlpha(t.colors?.border ?? "#000000", 0.55);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: containerBg,
          borderBottomColor: divider,
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
            paddingHorizontal: t.spacing?.pagePaddingH ?? 16,
            gap: t.spacing?.space?.[2] ?? 8,
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
            mode === "filter" && cat.id === "ALL"
              ? isAllSelected
              : (value ?? []).includes(cat.id as CategoryKey);

          const baseColor =
            cat.id === "ALL"
              ? (t.colors?.textMain ?? "#111111")
              : cat.color ?? (t.colors?.primary ?? "#1565C0");

          // ✅ 컨테이너가 흰색이므로, 비선택 칩은 '화이트 + 보더' 기반으로 명확하게
          const unselectedBg = "#FFFFFF";
          const bg = selected ? baseColor : unselectedBg;

          const borderColor = selected
            ? "transparent"
            : cat.id === "ALL"
              ? (t.colors?.border ?? withAlpha("#000000", 0.14))
              : withAlpha(baseColor, 0.28);

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
                  backgroundColor: bg,
                  borderColor,
                  borderWidth: selected ? 0 : StyleSheet.hairlineWidth,
                  opacity: pressed ? 0.92 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  ...(Platform.OS === "android" ? { elevation: selected ? 1 : 0 } : null),
                },
                selected ? styles.chipSelectedShadow : styles.chipShadow,
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
  container: {
    position: "relative",
    zIndex: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    // ✅ 요구사항: 배경 카드감/그림자 제거
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
  iconLeft: { marginRight: 6 },
  iconRight: { marginLeft: 6, opacity: 0.95 },
});

/*
요약: 컨테이너 배경을 항상 흰색(불투명)으로 고정하고, 컨테이너 카드/그림자 느낌을 제거했습니다.
요약: 비선택 칩은 흰색 배경+컬러 보더로 분리감을 주고, 선택 칩만 색상 채움으로 강조합니다.
요약: 오탭 방지/멀티선택/전체(빈 배열) 규칙은 그대로 유지합니다.
*/
