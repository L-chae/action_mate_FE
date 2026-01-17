// app/(auth)/signup.tsx
import React from "react";
import { Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import SignupScreen from "@/features/auth/SignupScreen";

export default function SignupRoute() {
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
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={{ padding: 8 }}
              accessibilityRole="button"
              accessibilityLabel="뒤로가기"
            >
              <MaterialIcons name="arrow-back-ios-new" size={22} color={iconColor} />
            </Pressable>
          ),
        }}
      />
      <SignupScreen />
    </>
  );
}