<<<<<<< Updated upstream
import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAppTheme } from "~/shared/hooks/useAppTheme";

export default function RootLayout() {
  const t = useAppTheme();

  return (
    <>
      <StatusBar style={t.mode === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.colors.background },
        }}
      />
    </>
  );
=======
// app/_layout.tsx
import React, { useEffect } from "react";
import { Slot, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { useAuthStore } from "@/features/auth/authStore";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  useEffect(() => {
    if (!navState?.key) return; // ✅ Root Layout 마운트/네비 준비 전이면 아무것도 안함

    const inAuthGroup = segments[0] === "(auth)";

    if (!isLoggedIn && !inAuthGroup) router.replace("/(auth)/login");
    if (isLoggedIn && inAuthGroup) router.replace("/(tabs)");
  }, [navState?.key, isLoggedIn, segments, router]);

  return <Slot />;
>>>>>>> Stashed changes
}
