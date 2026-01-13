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
}
