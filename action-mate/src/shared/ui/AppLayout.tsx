import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../hooks/useAppTheme";

export default function AppLayout({
  children,
  style,
  padded = true,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}) {
  const t = useAppTheme();

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: t.colors.background }, style]}
      edges={["top", "left", "right"]} // ✅ top safe area
    >
      <View
        style={[
          styles.body,
          padded && { paddingHorizontal: t.spacing.pagePaddingH, paddingVertical: t.spacing.pagePaddingV },
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
