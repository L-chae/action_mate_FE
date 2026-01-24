// src/shared/ui/MultiCategoryChips.tsx
import React, { useMemo, useRef } from "react";
import { ScrollView } from "react-native-gesture-handler";
import { Pressable, Text, StyleSheet, View, ViewStyle, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
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
} as any;

// ✅ 카테고리별 색상(구분성 강화)
const CATEGORY_COLORS: Partial<Record<CategoryKey, string>> = {
  SPORTS: "#2E7D32",
  GAMES: "#6A1B9A",
  MEAL: "#EF6C00",
  STUDY: "#1565C0",
  ETC: "#546E7A",
} as any;

type ChipItem = {
  id: "ALL" | CategoryKey;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  color?: string;
};

const BASE_CATEGORIES: ChipItem[] = [
  { id: "SPORTS" as any, label: "운동", iconName: (CATEGORY_ICONS as any).SPORTS ?? "apps", color: (CATEGORY_COLORS as any).SPORTS },
  { id: "GAMES" as any, label: "오락/게임", iconName: (CATEGORY_ICONS as any).GAMES ?? "apps", color: (CATEGORY_COLORS as any).GAMES },
  { id: "MEAL" as any, label: "식사/카페", iconName: (CATEGORY_ICONS as any).MEAL ?? "apps", color: (CATEGORY_COLORS as any).MEAL },
  { id: "STUDY" as any, label: "스터디", iconName: (CATEGORY_ICONS as any).STUDY ?? "apps", color: (CATEGORY_COLORS as any).STUDY },
  { id: "ETC" as any, label: "기타", iconName: (CATEGORY_ICONS as any).ETC ?? "apps", color: (CATEGORY_COLORS as any).ETC },
];

type Props = {
  /** 선택된 카테고리들 (빈 배열이면 "전체" 의미) */
  value: CategoryKey[];
  onChange: (next: CategoryKey[]) => void;

  /**
   * - filter: 전체 칩 포함 + 빈 배열을 전체로 취급
   * - select: 전체 칩 제외 (멀티 선택 입력용)
   * @default "filter"
   */
  mode?: "filter" | "select";

  transparentBackground?: boolean;
  containerStyle?: ViewStyle;

  /** 기타(ETC) 노출 여부 */
  includeEtc?: boolean;

  /** 카테고리별 색상 덮어쓰기 */
  colorOverrides?: Partial<Record<CategoryKey, string>>;
};

function withAlpha(hex: string, alpha01: number) {
  const a = Math.max(0, Math.min(1, alpha01));
  const alpha = Math.round(a * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();

  if (typeof hex !== "string") return hex as any;
  if (!hex.startsWith("#")) return hex;
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;

  return `#${h}${alpha}`;
}

export default function MultiCategoryChips({
  value,
  onChange,
  mode = "filter",
  transparentBackground = false,
  containerStyle,
  includeEtc = true,
  colorOverrides,
}: Props) {
  const t = useAppTheme();

  // ✅ 스크롤 중 탭 오작동 방지 (바텀시트/지도 중첩에서 자주 발생)
  const draggingRef = useRef(false);
  const pendingIdRef = useRef<string | null>(null);

  const isAllSelected = mode === "filter" && value.length === 0;

  const categories = useMemo(() => {
    const base = includeEtc ? BASE_CATEGORIES : BASE_CATEGORIES.filter((c) => c.id !== ("ETC" as any));
    return base.map((c) => {
      if (c.id === "ALL") return c;
      const override = colorOverrides?.[c.id as CategoryKey];
      return override ? { ...c, color: override } : c;
    });
  }, [includeEtc, colorOverrides]);

  const visible = useMemo(() => {
    if (mode === "select") return categories;
    return [{ id: "ALL", label: "전체", iconName: ALL_ICON }, ...categories] as ChipItem[];
  }, [mode, categories]);

  const toggle = (id: string) => {
    if (mode === "filter" && id === "ALL") {
      // why: 멀티 상태에서 "전체"는 빈 배열로 표현하면 필터 로직이 단순/안정적
      onChange([]);
      return;
    }

    const key = id as any as CategoryKey;

    // ✅ 전체(빈 배열) 상태에서 첫 선택은 바로 추가
    if (value.length === 0) {
      onChange([key]);
      return;
    }

    const exists = value.includes(key);
    if (exists) {
      const next = value.filter((c) => c !== key);
      onChange(next); // 마지막 해제 시 빈 배열 => 전체
      return;
    }

    onChange([...value, key]);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: transparentBackground ? "transparent" : t.colors.background,
          borderBottomColor: t.colors.border,
          paddingVertical: t.spacing?.space?.[2] ?? 8,
        },
        containerStyle,
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
            paddingHorizontal: t.spacing?.pagePaddingH ?? 16,
            gap: t.spacing?.space?.[2] ?? 8,
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
        {visible.map((cat) => {
          const isSelected =
            mode === "filter" && cat.id === "ALL" ? isAllSelected : value.includes(cat.id as CategoryKey);

          const baseColor =
            cat.id === "ALL"
              ? (t.colors.textMain ?? "#111")
              : cat.color ?? (t.colors.primary ?? "#1565C0");

          const bg = isSelected ? baseColor : withAlpha(baseColor, transparentBackground ? 0.12 : 0.10);
          const borderColor = isSelected ? withAlpha(baseColor, 0.35) : withAlpha(baseColor, 0.55);
          const textColor = isSelected ? WHITE : baseColor;
          const iconColor = isSelected ? WHITE : baseColor;

          return (
            <Pressable
              key={String(cat.id)}
              accessibilityRole="button"
              hitSlop={12}
              pressRetentionOffset={30}
              onPressIn={() => {
                pendingIdRef.current = String(cat.id);
              }}
              onPressOut={() => {
                if (draggingRef.current) {
                  pendingIdRef.current = null;
                  return;
                }
                if (pendingIdRef.current === String(cat.id)) toggle(String(cat.id));
                pendingIdRef.current = null;
              }}
              android_ripple={
                Platform.OS === "android" ? { color: withAlpha("#000000", 0.08), borderless: false } : undefined
              }
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: bg,
                  borderColor,
                  opacity: pressed ? 0.92 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
                isSelected ? styles.chipSelectedShadow : styles.chipShadow,
              ]}
            >
              <Ionicons name={cat.iconName} size={16} color={iconColor} style={{ marginRight: 8 }} />
              <Text
                style={[
                  t.typography?.labelMedium ?? { fontSize: 13 },
                  { color: textColor, fontWeight: isSelected ? "800" : "600" },
                ]}
              >
                {cat.label}
              </Text>
              {isSelected && cat.id !== "ALL" ? (
                <Ionicons name="checkmark" size={16} color={WHITE} style={{ marginLeft: 8, opacity: 0.95 }} />
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
    elevation: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scrollContent: {
    paddingRight: 16,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
  },
  chipShadow: {
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  chipSelectedShadow: {
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
});