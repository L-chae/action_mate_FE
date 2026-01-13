import React from "react";
import { Pressable, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

type Props = {
  value: number;
  size?: number;
  readonly?: boolean;
  onChange?: (value: number) => void;
  color?: string;
  inactiveColor?: string;
};

export function RatingStars({
  value,
  size = 22,
  readonly,
  onChange,
  color = "#FFC84D",
  inactiveColor = "rgba(0,0,0,0.2)",
}: Props) {
  const v = Math.max(0, Math.min(5, Math.round(value)));

  return (
    <View style={{ flexDirection: "row", gap: 4 } as any}>
      {Array.from({ length: 5 }).map((_, i) => {
        const idx = i + 1;
        const filled = idx <= v;

        const icon = (
          <MaterialIcons
            name={filled ? "star" : "star-border"}
            size={size}
            color={filled ? color : inactiveColor}
          />
        );

        if (readonly || !onChange) return <View key={idx}>{icon}</View>;

        return (
          <Pressable key={idx} onPress={() => onChange(idx)} hitSlop={8}>
            {icon}
          </Pressable>
        );
      })}
    </View>
  );
}
