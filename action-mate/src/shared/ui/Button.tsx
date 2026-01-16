import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";
import { withAlpha } from "../theme/colors";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  left?: React.ReactNode;
  right?: React.ReactNode;
  style?: ViewStyle;
};

const WHITE = "#FFFFFF";

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  left,
  right,
  style,
}: Props) {
  const t = useAppTheme();
  const { colors, spacing, typography } = t;

  const isDisabled = disabled || loading;

  const metrics = (() => {
    switch (size) {
      case "sm":
        return { h: 40, px: 12, radius: spacing.radiusSm };
      case "lg":
        return { h: 52, px: 18, radius: spacing.radiusLg };
      default:
        return { h: 46, px: 16, radius: spacing.radiusMd };
    }
  })();

  const v = (() => {
    switch (variant) {
      case "secondary":
        return {
          bg: colors.surface,
          fg: colors.textMain,
          borderColor: colors.border,
          borderWidth: spacing.borderWidth,
          // pressedBg는 iOS/Android 공통으로 안정적
          pressedBg: colors.overlay[6],
        };
      case "ghost":
        return {
          bg: "transparent",
          fg: colors.primary,
          borderColor: "transparent",
          borderWidth: 0,
          pressedBg: withAlpha(colors.primary, 0.10),
        };
      case "danger":
        return {
          bg: colors.error,
          fg: WHITE,
          borderColor: colors.error,
          borderWidth: 0,
          pressedBg: withAlpha(colors.error, 0.85), // 살짝 눌림 느낌(투명도)
        };
      default:
        return {
          bg: colors.primary,
          fg: WHITE,
          borderColor: colors.primary,
          borderWidth: 0,
          pressedBg: withAlpha(colors.primary, 0.85),
        };
    }
  })();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        {
          height: metrics.h,
          paddingHorizontal: metrics.px,
          borderRadius: metrics.radius,

          backgroundColor: isDisabled
            ? colors.disabledBg
            : pressed
              ? v.pressedBg
              : v.bg,

          borderColor: v.borderColor,
          borderWidth: v.borderWidth,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        {left ? <View style={styles.left}>{left}</View> : null}

        {loading ? (
          <ActivityIndicator color={isDisabled ? colors.disabledFg : v.fg} />
        ) : (
          <Text
            style={[
              typography.labelLarge,
              { color: isDisabled ? colors.disabledFg : v.fg },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
        )}

        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { justifyContent: "center", alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center" },
  left: { marginRight: 8 },
  right: { marginLeft: 8 },
});
