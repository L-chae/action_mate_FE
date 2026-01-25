// src/shared/ui/Button.tsx
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

  // 의도: disabled와 loading을 동일하게 "비활성 상태"로 처리해 UX 일관성 유지
  const isDisabled = disabled || loading;

  // 의도: 초반 앱에서 가장 많이 쓰는 3단계만 제공(과도한 스케일 확장 방지)
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

  // 의도: variant별 "배경/전경/테두리/눌림색"만 정의해 스타일 계산을 단순화
  const v = (() => {
    switch (variant) {
      case "secondary":
        return {
          bg: colors.surface,
          fg: colors.textMain,
          borderColor: colors.border,
          borderWidth: spacing.borderWidth,
          pressedBg: colors.overlay[6], // 공통 pressed 레이어
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
          pressedBg: withAlpha(colors.error, 0.85),
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

          // 의도: 상태 우선순위(Disabled > Pressed > Normal)로 시각/동작 일치
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