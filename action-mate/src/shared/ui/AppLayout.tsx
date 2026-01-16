import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../hooks/useAppTheme";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;

  /** 필요할 때만 bottom safearea 포함 (탭바 있으면 false로 유지 가능) */
  safeBottom?: boolean;
};

export default function AppLayout({
  children,
  style,
  padded = true,
  safeBottom = false,
}: Props) {
  const t = useAppTheme();

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: t.colors.background }, style]}
      edges={safeBottom ? ["top", "left", "right", "bottom"] : ["top", "left", "right"]}
    >
      <View
        style={[
          styles.body,
          // ✅ body에도 배경을 깔아두면 내부가 투명/스크롤일 때도 안정적
          { backgroundColor: t.colors.background },
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
