import React from "react";
import { Pressable, type ViewStyle } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "../hooks/useAppTheme";

type Props = {
  onPress: () => void;
  style?: ViewStyle;
  iconName?: React.ComponentProps<typeof MaterialIcons>["name"];
};

export function Fab({ onPress, style, iconName = "add" }: Props) {
  const t = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          position: "absolute",
          right: 16,
          bottom: 16,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: t.colors.primary,
          alignItems: "center",
          justifyContent: "center",

          shadowColor: "#000",
          shadowOpacity: 0.22,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,

          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel="모임 만들기"
      hitSlop={10}
    >
      <MaterialIcons name={iconName} size={28} color="#fff" />
    </Pressable>
  );
}
