// src/shared/ui/Card.tsx
import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
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
  const { colors, spacing, shadow } = t;

  const Container: any = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      style={[
        // ✅ 테마 기반 그림자(ios) + elevation(android)
        Platform.select({
          ios: {
            shadowColor: colors.shadow.color,
            shadowOpacity: 0.08, // 필요하면 colors.shadow.opacityLow를 쓸 수도 있지만 RN은 숫자가 필요함
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
          },
          android: { elevation: shadow.elevationSm },
          default: {},
        }),

        // ✅ 표면/테두리/라운드도 테마 토큰 사용
        {
          backgroundColor: colors.surface,
          borderRadius: spacing.radiusLg,
          borderWidth: spacing.borderWidth,
          borderColor: colors.border,
          padding: padded ? spacing.pagePaddingH : 0,
        },

        style,
      ]}
    >
      {children}
    </Container>
  );
}