// app/settings/profile.tsx
import React from "react";
import { Stack } from "expo-router";
import ProfileSettingsScreen from "@/features/settings/ProfileSettingsScreen";

export default function ProfileSettingsRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ProfileSettingsScreen />
    </>
  );
}
