import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

type Tone = "default" | "primary" | "point" | "success" | "warning" | "error";
type Size = "sm" | "md";

export function Badge({
  label,
  tone = "default",
  size = "sm",
  style,
}: {
  label: string;
  tone?: Tone;
  size?: Size;
  style?: ViewStyle;
}) {
  const { colors, spacing, typography } = useAppTheme();

  const s = size === "md"
    ? { py: 6, px: 10, radius: spacing.radiusMd, typo: typography.labelMedium }
    : { py: 4, px: 8, radius: spacing.radiusSm, typo: typography.labelSmall };

  const toneStyle = (() => {
    // “soft background”는 현재 토큰에 없으니 간단히 연한 배경으로 처리
    const soft = (hex: string) => hex + "22"; // 대충 13% 알파 느낌(문자열 hex에 22 추가)
    switch (tone) {
      case "primary":
        return { bg: soft(colors.primary), fg: colors.primary };
      case "point":
        return { bg: soft(colors.point), fg: colors.primaryDark };
      case "success":
        return { bg: soft(colors.success), fg: colors.success };
      case "warning":
        return { bg: soft(colors.warning), fg: colors.warning };
      case "error":
        return { bg: soft(colors.error), fg: colors.error };
      default:
        return { bg: colors.border, fg: colors.textSub };
    }
  })();

  return (
    <View
      style={[
        styles.base,
        {
          paddingVertical: s.py,
          paddingHorizontal: s.px,
          borderRadius: s.radius,
          backgroundColor: toneStyle.bg,
        },
        style,
      ]}
    >
      <Text style={[s.typo, { color: toneStyle.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignSelf: "flex-start" },
});
