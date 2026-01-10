import React from "react";
import { View, ViewProps, Platform, ViewStyle } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

type Props = ViewProps & { padded?: boolean };

export function Card({ padded = true, style, ...rest }: Props) {
  const t = useAppTheme();
  const isDark = t.mode === "dark";

  const base: ViewStyle = {
    backgroundColor: t.colors.surface,
    borderRadius: t.spacing.radiusMd,
    borderWidth: isDark ? 1 : 0,
    borderColor: isDark ? t.colors.border : "transparent",
    padding: padded ? 16 : 0,
  };

  // ✅ RN(iOS/Android) + Web 경고 회피(웹은 boxShadow)
  const shadow: ViewStyle =
    Platform.OS === "web"
      ? ({ boxShadow: isDark ? "none" : "0px 4px 10px rgba(0,0,0,0.10)" } as any)
      : isDark
        ? { elevation: 0 }
        : {
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
          };

  return <View {...rest} style={[base, shadow, style]} />;
}
