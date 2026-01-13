import React from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useAppTheme } from "../../../shared/hooks/useAppTheme";
import { CATEGORIES } from "../meetingService";
import type { CategoryKey } from "../types";

const ORDER: (CategoryKey | "ALL")[] = ["ALL", "SPORTS", "GAMES", "MEAL", "ETC"];

export default function CategoryChips({
  value,
  onChange,
}: {
  value: CategoryKey | "ALL";
  onChange: (v: CategoryKey | "ALL") => void;
}) {
  const t = useAppTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, { paddingHorizontal: t.spacing.pagePaddingH }]}
    >
      {ORDER.map((key) => {
        const selected = key === value;

        const label =
          key === "ALL" ? "전체" : `${CATEGORIES[key].icon} ${CATEGORIES[key].name}`;

        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? t.colors.textMain : t.colors.surface,
                borderColor: "transparent",
              },
            ]}
          >
            <Text style={[t.typography.labelMedium, { color: selected ? "#fff" : t.colors.textMain }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
});
