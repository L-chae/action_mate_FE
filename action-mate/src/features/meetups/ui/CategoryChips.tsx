import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "~/shared/hooks/useAppTheme";

export type CategoryChipValue = "all" | "running" | "climb" | "badminton" | "walk" | "etc";

type ChipItem = { value: CategoryChipValue; label: string };

type Props = {
  value?: CategoryChipValue;                 // controlled
  defaultValue?: CategoryChipValue;          // uncontrolled
  onChange?: (v: CategoryChipValue) => void;
  items?: ChipItem[];
};

export function CategoryChips({
  value,
  defaultValue = "all",
  onChange,
  items,
}: Props) {
  const t = useAppTheme();
  const data = useMemo<ChipItem[]>(
    () =>
      items ?? [
        { value: "all", label: "전체" },
        { value: "running", label: "🏃 러닝" },
        { value: "climb", label: "🧗 클라이밍" },
        { value: "badminton", label: "🏸 배드민턴" },
        { value: "walk", label: "🚶 산책" },
        { value: "etc", label: "✨ 기타" },
      ],
    [items]
  );

  const [inner, setInner] = useState<CategoryChipValue>(defaultValue);
  const selected = value ?? inner;

  const select = (v: CategoryChipValue) => {
    if (value == null) setInner(v);
    onChange?.(v);
  };

  return (
    <View style={{ backgroundColor: t.colors.background }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {data.map((it) => {
          const isSelected = it.value === selected;
          return (
            <Pressable
              key={it.value}
              onPress={() => select(it.value)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: isSelected ? t.colors.textMain : t.colors.surface,
                  borderColor: isSelected ? t.colors.textMain : t.colors.border,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Text
                style={[
                  t.typography.labelLarge,
                  { color: isSelected ? t.colors.background : t.colors.textMain },
                ]}
              >
                {it.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
  },
});
