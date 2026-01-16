// src/shared/ui/Badge.tsx
import React from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import { withAlpha } from "../theme/colors";

export type Tone =
  | "default"
  | "neutral"
  | "primary"
  | "point"
  | "success"
  | "warning"
  | "error";

export type Size = "sm" | "md";

type Props = {
  label: string;
  tone?: Tone;
  size?: Size;
  style?: ViewStyle;
  /** ✅ 둥근 태그(알약)로 통일: 기본 true */
  pill?: boolean;
};

export function Badge({
  label,
  tone = "default",
  size = "sm",
  style,
  pill = true,
}: Props) {
  const t = useAppTheme();
  const { colors, typography } = t;

  const s =
    size === "md"
      ? { py: 6, px: 10, typo: typography.labelMedium }
      : { py: 4, px: 9, typo: typography.labelSmall };

  const toneStyle = (() => {
    // ✅ 다크에서는 배경이 더 진해야 “pill”이 살아남음
    const alphaBase = t.mode === "dark" ? 0.22 : 0.14;
    const soft = (hex: string, a = alphaBase) => withAlpha(hex, a);

    switch (tone) {
      case "primary":
        return { bg: soft(colors.primary), fg: colors.primary };

      case "point":
        // ✅ 다크에서 primaryDark가 튀면 point 자체를 fg로 쓰는 게 안정적
        return { bg: soft(colors.point, alphaBase + 0.02), fg: colors.point };

      case "success":
        return { bg: soft(colors.success), fg: colors.success };

      case "warning":
        return { bg: soft(colors.warning, alphaBase + 0.02), fg: colors.warning };

      case "error":
        return { bg: soft(colors.error), fg: colors.error };

      case "neutral":
        // ✅ 완전 중립 pill (라이트/다크 공통 안정)
        return { bg: colors.overlay[8], fg: colors.textSub };

      default:
        // default는 neutral보다 더 약하게
        return { bg: colors.overlay[6], fg: colors.textSub };
    }
  })();

  return (
    <View
      style={[
        styles.base,
        {
          paddingVertical: s.py,
          paddingHorizontal: s.px,
          borderRadius: pill ? 999 : 12, // ✅ 알약 통일
          backgroundColor: toneStyle.bg,
        },
        style,
      ]}
    >
      <Text style={[s.typo, styles.text, { color: toneStyle.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignSelf: "flex-start" },
  text: {
    // ✅ 작은 텍스트는 가독성 위해 살짝만 진하게
    fontWeight: "800",
  },
});