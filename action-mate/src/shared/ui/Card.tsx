// src/shared/ui/Card.tsx

import React from "react";
import { 
  Platform, 
  Pressable, 
  StyleSheet, 
  View, 
  type StyleProp,  
  type ViewStyle 
} from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>; 
  padded?: boolean;
  onPress?: () => void;
};

export function Card({ children, style, padded = true, onPress }: Props) {
  const { colors, spacing } = useAppTheme();
  const Container: any = onPress ? Pressable : View;

  return (
    <Container
      onPress={onPress}
      style={[
        styles.shadow,
        {
          backgroundColor: colors.surface,
          borderRadius: spacing.radiusLg,
          borderWidth: spacing.borderWidth,
          borderColor: colors.border,
          padding: padded ? spacing.pagePaddingH : 0,
        },
        style, // 배열이든 객체든 다 받아줌
      ]}
    >
      {children}
    </Container>
  );
}

const styles = StyleSheet.create({
  shadow: Platform.select({
    ios: {
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 2 },
    default: {},
  }),
});