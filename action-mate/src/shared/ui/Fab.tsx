import React, { useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "../hooks/useAppTheme";

type Props = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  iconName?: React.ComponentProps<typeof MaterialIcons>["name"];
  accessibilityLabel?: string;
  disabled?: boolean;
};

export function Fab({
  onPress,
  style,
  iconName = "add",
  accessibilityLabel = "모임 만들기",
  disabled = false,
}: Props) {
  const t = useAppTheme();

  // ✅ 매 렌더마다 객체 새로 안 만들게(미세 최적화)
  const baseStyle = useMemo(
    () => [
      styles.base,
      {
        backgroundColor: disabled ? t.colors.neutral[300] : t.colors.primary,
      },
      style,
    ],
    [disabled, t.colors.neutral, t.colors.primary, style]
  );

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        baseStyle,
        {
          opacity: disabled ? 0.6 : pressed ? 0.85 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={10}
    >
      <MaterialIcons name={iconName} size={28} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
