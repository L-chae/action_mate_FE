// app/(auth)/reset-password.tsx
import React from "react";
import { Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import ResetPasswordScreen from "@/features/auth/ResetPasswordScreen";

export default function ResetPasswordRoute() {
  const t = useAppTheme();
  const c = t.colors as any;

  const headerBg = c.background ?? c.bg ?? c.surface ?? c.card ?? t.colors.background;
  const iconColor = c.fg ?? c.onBackground ?? c.onSurface ?? t.colors.primary;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: headerBg },
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: 8 }}>
              <MaterialIcons name="arrow-back-ios-new" size={22} color={iconColor} />
            </Pressable>
          ),
        }}
      />
      <ResetPasswordScreen />
    </>
  );
}