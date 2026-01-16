// src/shared/ui/Card.tsx
import React from "react";
import {
  Platform,
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  onPress?: () => void;
};

export function Card({ children, style, padded = true, onPress }: Props) {
  const t = useAppTheme();
  const { colors, spacing, shadow, mode } = t;

  const Container: any = onPress ? Pressable : View;
  const isDark = mode === "dark";

  return (
    <Container
      onPress={onPress}
      style={[
        Platform.select({
          ios: {
            shadowColor: colors.shadow?.color ?? "#000",
            shadowOpacity: isDark ? 0.18 : 0.08,
            shadowRadius: isDark ? 10 : 12,
            shadowOffset: { width: 0, height: isDark ? 4 : 6 },
          },
          android: { elevation: isDark ? shadow.elevationSm : shadow.elevationSm },
          default: {},
        }),

        {
          backgroundColor: colors.surface,
          borderRadius: spacing.radiusLg,
          borderWidth: spacing.borderWidth,
          borderColor: colors.border,
          padding: padded ? spacing.pagePaddingH : 0,

          // ✅ 다크에서 “면 분리감”을 보더/미세한 밝기 차로 보강(선택)
          ...(isDark ? { borderColor: colors.divider ?? colors.border } : null),
        },

        style,
      ]}
    >
      {children}
    </Container>
  );
}