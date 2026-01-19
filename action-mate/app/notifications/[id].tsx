// app/notifications/[id].tsx
import React from "react";
import { Stack } from "expo-router";
import NotificationDetailScreen from "@/features/notifications/NotificationDetailScreen";

export default function NotificationDetailRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <NotificationDetailScreen />
    </>
  );
}