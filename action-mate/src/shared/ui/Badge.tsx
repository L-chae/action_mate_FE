import React from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import { withAlpha } from "../theme/colors";

type Tone =
  | "default"
  | "neutral"
  | "primary"
  | "point"
  | "success"
  | "warning"
  | "error";

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
  const t = useAppTheme();
  const { colors, spacing, typography } = t;

  const s =
    size === "md"
      ? { py: 6, px: 10, radius: spacing.radiusMd, typo: typography.labelMedium }
      : { py: 4, px: 8, radius: spacing.radiusSm, typo: typography.labelSmall };

  const toneStyle = (() => {
    const soft = (hex: string, a = 0.14) => withAlpha(hex, a);

    switch (tone) {
      case "primary":
        return { bg: soft(colors.primary, 0.14), fg: colors.primary };

      case "point":
        return { bg: soft(colors.point, 0.16), fg: colors.primaryDark };

      case "success":
        return { bg: soft(colors.success, 0.14), fg: colors.success };

      case "warning":
        return { bg: soft(colors.warning, 0.16), fg: colors.warning };

      case "error":
        return { bg: soft(colors.error, 0.14), fg: colors.error };

      case "neutral":
        // ✅ 다크에서도 자연스럽게: overlay 기반
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