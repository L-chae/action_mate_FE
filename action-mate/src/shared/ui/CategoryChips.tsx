import React, { useMemo, useRef } from "react";
// ✅ 바텀시트 내부 스크롤 충돌 방지를 위해 gesture-handler 사용
import { ScrollView } from "react-native-gesture-handler";
import { Pressable, Text, StyleSheet, View, Platform } from "react-native";
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

  /**
   * 외부에서 padding/배경 등을 제어하고 싶을 때 사용
   * - Home sticky bar에서는 paddingVertical을 줄여 하단 공백을 줄이는 데 사용 가능
   */
  style?: any;
  contentContainerStyle?: any;
};

export default function CategoryChips({
  value,
  onChange,
  mode = "filter",
  style,
  contentContainerStyle,
}: Props) {
  const t = useAppTheme();

  // "왜": 수평 스크롤(gesture)과 Pressable 탭이 충돌할 때
  // 스크롤 중에는 탭을 무시하고, 스크롤이 아닌 경우만 onChange를 확정하기 위함
  const draggingRef = useRef(false);
  const pendingIdRef = useRef<ChipKey | null>(null);
  const lastDragAtRef = useRef(0);

  const visibleCategories = useMemo(() => {
    if (mode === "select") return CATEGORIES.filter((c) => c.id !== "ALL");
    return CATEGORIES;
  }, [mode]);

  const markDragging = () => {
    draggingRef.current = true;
    pendingIdRef.current = null;
    lastDragAtRef.current = Date.now();
  };

  const clearDraggingSoon = () => {
    // "왜": iOS/Android에서 onScrollEndDrag 직후에도 터치가 이어지는 경우가 있어
    // 아주 짧은 시간 동안은 드래그로 간주해서 오동작(탭 오인식)을 막음
    requestAnimationFrame(() => {
      draggingRef.current = false;
    });
  };

  const shouldIgnoreTap = () => {
    // "왜": 모멘텀 종료 직후 아주 짧게 탭이 들어오는 케이스 방지
    // (특히 안드에서 fling 후 onPressOut이 뒤늦게 들어올 때)
    const now = Date.now();
    return draggingRef.current || now - lastDragAtRef.current < 80;
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: t.colors.background,
          borderBottomColor: t.colors.border,
          paddingVertical: t.spacing.space[2], // 기존 12 -> 8로: 하단 공백 체감 줄이기
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
        // "왜": sticky header / 중첩 스크롤 환경에서 iOS 바운스/오버스크롤이 탭 체감을 나쁘게 만들 수 있어 최소화
        bounces={false}
        overScrollMode="never"
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: t.spacing.pagePaddingH,
            gap: t.spacing.space[2],
          },
          contentContainerStyle,
        ]}
        // 스크롤 제스처 감지 로직
        onScrollBeginDrag={markDragging}
        onScrollEndDrag={clearDraggingSoon}
        onMomentumScrollBegin={markDragging}
        onMomentumScrollEnd={() => {
          draggingRef.current = false;
          lastDragAtRef.current = Date.now();
        }}
        scrollEventThrottle={16}
      >
        {visibleCategories.map((cat) => {
          const isSelected = value === cat.id;
          const iconColor = isSelected ? WHITE : t.colors.icon.muted;

          return (
            <Pressable
              key={cat.id}
              hitSlop={10}
              pressRetentionOffset={20}
              android_disableSound
              // "왜": onPress 하나로 처리하면 스크롤과 경합 시 오탭이 나거나, 반대로 탭이 무시되는 케이스가 있어
              // press-in/out로 확정 로직을 분리해 예측 가능하게 만듦
              onPressIn={() => {
                pendingIdRef.current = cat.id;
              }}
              onPressOut={() => {
                if (pendingIdRef.current !== cat.id) return;

                if (shouldIgnoreTap()) {
                  pendingIdRef.current = null;
                  return;
                }

                onChange(cat.id);
                pendingIdRef.current = null;
              }}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isSelected ? t.colors.primary : t.colors.chipBg,
                  borderColor: isSelected ? "transparent" : t.colors.border,
                  borderWidth: isSelected ? 0 : StyleSheet.hairlineWidth,
                  opacity: pressed ? 0.9 : 1,
                  // "왜": sticky bar 위에서 터치가 씹히는 체감이 있을 때
                  // 안드에서 elevation이 너무 크면 레이아웃/클리핑 이슈가 나기도 해서 최소한만 부여
                  ...(Platform.OS === "android" ? { elevation: isSelected ? 1 : 0 } : null),
                },
              ]}
            >
              <Ionicons name={cat.iconName} size={16} color={iconColor} style={{ marginRight: 6 }} />
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

    // "왜": 칩 컨테이너 자체에 강한 그림자를 주면
    // sticky/스크롤 상황에서 레이어 충돌이 나는 경우가 있어 아주 약하게만 적용
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
    paddingVertical: 9, // 8 -> 7로: 높이 타이트하게
    borderRadius: 999,
  },
  bottomDivider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.7,
  },
});
