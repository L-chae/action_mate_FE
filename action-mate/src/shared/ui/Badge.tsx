import React from "react";
import { View, Text, ViewStyle } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

type Tone = "default" | "primary" | "warning" | "danger" | "success" | "info";

export function Badge({ label, tone = "default" }: { label: string; tone?: Tone }) {
  const t = useAppTheme();

  const bg =
    tone === "primary" ? t.colors.primary :
    tone === "warning" ? t.colors.warning :
    tone === "danger" ? t.colors.error :
    tone === "success" ? t.colors.success :
    tone === "info" ? t.colors.info :
    t.mode === "dark" ? "rgba(255,255,255,0.10)" : "#F3F3F3";

  const fg = tone === "default" ? t.colors.textMain : "#FFFFFF";

  const container: ViewStyle = {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: t.spacing.radiusMd,
    backgroundColor: bg,
  };

  return (
    <View style={container}>
      <Text style={[t.typography.labelSmall, { color: fg }]}>{label}</Text>
    </View>
  );
}
