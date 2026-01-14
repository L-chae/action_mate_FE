import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

type Tab = { key: string; label: string };

type Props = {
  tabs: Tab[];
  activeKey: string;
  onChange: (key: string) => void;
};

export default function SegmentedTabs({ tabs, activeKey, onChange }: Props) {
  const t = useAppTheme();

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: t.colors.surface,
          borderColor: t.colors.border,
          borderRadius: t.spacing.radiusLg,
          borderWidth: t.spacing.borderWidth,
          padding: 4,
        },
      ]}
    >
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={({ pressed }) => [
              styles.item,
              {
                borderRadius: t.spacing.radiusMd,
                backgroundColor: active ? t.colors.primary : "transparent",
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text style={[t.typography.labelLarge, { color: active ? "#fff" : t.colors.textMain }]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", gap: 6 },
  item: { flex: 1, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
});
