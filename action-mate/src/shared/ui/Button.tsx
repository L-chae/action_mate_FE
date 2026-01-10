import React from "react";
import { Pressable, Text, ViewStyle } from "react-native";
import { useAppTheme } from "../hooks/useAppTheme";

type Variant = "primary" | "outlined" | "text";

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: Variant;
  style?: ViewStyle;
};

export function Button({ title, onPress, disabled, variant = "primary", style }: Props) {
  const t = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => {
        const base: ViewStyle = {
          paddingHorizontal: 20,
          paddingVertical: 12,
          borderRadius: t.spacing.radiusSm,
          alignItems: "center",
          justifyContent: "center",
        };

        if (variant === "primary") {
          base.backgroundColor = disabled
            ? t.colors.disabledBg
            : pressed
              ? t.colors.primaryDark
              : t.colors.primary;
        }

        if (variant === "outlined") {
          base.backgroundColor = "transparent";
          base.borderWidth = 1;
          base.borderColor = disabled ? t.colors.border : t.colors.primary;
        }

        if (variant === "text") {
          base.backgroundColor = "transparent";
        }

        if (pressed && !disabled) base.opacity = 0.95;

        return [base, style];
      }}
    >
      <Text
        style={[
          t.typography.labelLarge,
          { fontWeight: "700" },
          variant === "primary" && { color: disabled ? t.colors.disabledFg : "#FFFFFF" },
          variant !== "primary" && { color: disabled ? t.colors.disabledFg : t.colors.primary },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
