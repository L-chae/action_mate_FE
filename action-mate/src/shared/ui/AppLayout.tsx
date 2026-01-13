import React from "react";
import { SafeAreaView, StyleSheet, View, type ViewStyle } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

type Props = {
  children: React.ReactNode;
  padded?: boolean;
  style?: ViewStyle;
};

/**
 * 화면 공통 레이아웃
 * - SafeArea 적용
 * - 기본 배경색(theme.background)
 * - 기본 패딩 옵션
 */
export default function AppLayout({ children, padded = true, style }: Props) {
  const t = useAppTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.colors.background }]}>
      <View
        style={[
          styles.container,
          padded && { paddingHorizontal: t.spacing.pagePaddingH, paddingVertical: t.spacing.pagePaddingV },
          style,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
});
