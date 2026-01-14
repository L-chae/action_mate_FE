import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../hooks/useAppTheme";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>; // ✅ 배열 스타일 허용
  padded?: boolean;
};

export default function AppLayout({ children, style, padded = true }: Props) {
  const t = useAppTheme();

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: t.colors.background }, style]}
      edges={["top", "left", "right"]}
    >
      <View
        style={[
          styles.body,
          padded && {
            paddingHorizontal: t.spacing.pagePaddingH,
            paddingVertical: t.spacing.pagePaddingV,
          },
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1 },
});
