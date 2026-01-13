// src/shared/ui/AppLayout.tsx
import React from "react";
import { SafeAreaView, StyleProp, StyleSheet, ViewStyle } from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>; // ✅ 추가 (이게 핵심)
};

export default function AppLayout({ children, style }: Props) {
  const t = useAppTheme();

  return (
    <SafeAreaView style={[styles.base, { backgroundColor: t.colors.background }, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
  },
});
