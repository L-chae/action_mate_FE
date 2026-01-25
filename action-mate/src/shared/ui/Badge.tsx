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
  // 의도: 초반 앱에서는 pill 형태로 통일하면 화면이 빨리 정돈됨
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

  // 의도: 크기 스케일은 2단계로 제한(텍스트/패딩 난립 방지)
  const s =
    size === "md"
      ? { py: 6, px: 10, typo: typography.labelMedium }
      : { py: 4, px: 9, typo: typography.labelSmall };

  const toneStyle = (() => {
    // 의도: 다크에서 pill이 죽지 않도록 배경 알파를 조금 더 강하게
    const alphaBase = t.mode === "dark" ? 0.22 : 0.14;
    const soft = (hex: string, a = alphaBase) => withAlpha(hex, a);

    switch (tone) {
      case "primary":
        return { bg: soft(colors.primary), fg: colors.primary };
      case "point":
        return { bg: soft(colors.point, alphaBase + 0.02), fg: colors.point };
      case "success":
        return { bg: soft(colors.success), fg: colors.success };
      case "warning":
        return { bg: soft(colors.warning, alphaBase + 0.02), fg: colors.warning };
      case "error":
        return { bg: soft(colors.error), fg: colors.error };
      case "neutral":
        return { bg: colors.overlay[8], fg: colors.textSub };
      default:
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
          borderRadius: pill ? 999 : 12,
          backgroundColor: toneStyle.bg,
        },
        style,
      ]}
    >
      <Text
        style={[s.typo, styles.text, { color: toneStyle.fg }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignSelf: "flex-start" },
  text: {
    // 의도: 작은 텍스트는 대비가 약해지기 쉬워 살짝만 강하게
    fontWeight: "800",
  },
});