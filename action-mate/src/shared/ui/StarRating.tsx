import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

type Props = {
  value: number; // 0~5
  onChange: (v: number) => void;
  size?: number;
  disabled?: boolean;
};

export default function StarRating({
  value,
  onChange,
  size = 28,
  disabled = false,
}: Props) {
  const t = useAppTheme();
  const stars = useMemo(() => [1, 2, 3, 4, 5], []);

  const filledColor = t.colors.primary;
  const emptyColor = t.colors.icon.muted;
  const disabledOpacity = 0.45;

  return (
    <View style={styles.row}>
      {stars.map((s) => {
        const filled = s <= value;

        return (
          <Pressable
            key={s}
            disabled={disabled}
            onPress={() => onChange(s)}
            style={({ pressed }) => [
              styles.starHit,
              { opacity: disabled ? disabledOpacity : pressed ? 0.7 : 1 },
            ]}
            hitSlop={10}
          >
            <Ionicons
              name={filled ? "star" : "star-outline"}
              size={size}
              color={filled ? filledColor : emptyColor}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  starHit: { paddingHorizontal: 3, paddingVertical: 4 },
});
