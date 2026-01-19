//app/notifications/index.tsx 
// 알림 목록 화면 (/notifications)
import React from "react";
import { Stack } from "expo-router";
import NotificationsScreen from "@/features/notifications/NotificationsScreen";

export default function NotificationsRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <NotificationsScreen />
    </>
  );
}