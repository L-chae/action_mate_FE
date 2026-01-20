// app/(auth)/signup.tsx
import React from "react";
import { Stack } from "expo-router";

import { useAppTheme } from "@/shared/hooks/useAppTheme";
import SignupScreen from "@/features/auth/SignupScreen";

export default function SignupRoute() {
  const t = useAppTheme();

  return (
    <>
      <Stack.Screen
        options={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: t.colors.background },
        }}
      />
      <SignupScreen />
    </>
  );
}
