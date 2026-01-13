import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ViewStyle } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

type Props = React.PropsWithChildren<{
  padded?: boolean;
  style?: ViewStyle;
}>;

export function Screen({ children, padded = true, style }: Props) {
  const t = useAppTheme();

  return (
    <SafeAreaView
      style={[
        {
          flex: 1,
          backgroundColor: t.colors.background,
          paddingHorizontal: padded ? t.spacing.pagePaddingH : 0,
          paddingVertical: padded ? t.spacing.pagePaddingV : 0,
        },
        style,
      ]}
    >
      {children}
    </SafeAreaView>
  );
}
