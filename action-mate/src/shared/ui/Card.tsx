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

  // 의도: 클릭 가능 여부만으로 컨테이너 타입을 결정해 API 단순화
  const Container: any = onPress ? Pressable : View;

  // 의도: 다크에서는 그림자보다 "보더/면 분리"가 더 중요해 보정 포인트만 둠
  const isDark = mode === "dark";

  return (
    <Container
      onPress={onPress}
      style={[
        Platform.select({
          // 의도: iOS는 shadow props, Android는 elevation 중심으로 처리(플랫폼 관례)
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

          // 의도: 다크에서 면이 붙어 보일 때 divider 톤으로 분리감만 보강(선택)
          ...(isDark ? { borderColor: colors.divider ?? colors.border } : null),
        },

        style,
      ]}
    >
      {children}
    </Container>
  );
}