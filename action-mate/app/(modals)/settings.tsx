// app/(tabs)/my/settings.tsx
import React from "react";
import { Stack } from "expo-router";
import AppLayout from "@/shared/ui/AppLayout";
import SettingsTab from "@/features/my/components/SettingsTab";

export default function SettingsPage() {
  return (
    <AppLayout>
      <Stack.Screen options={{ title: "설정" }} />
      <SettingsTab />
    </AppLayout>
  );
}
