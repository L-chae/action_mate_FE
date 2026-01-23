import React from "react";
import { Stack } from "expo-router";
import HostedMeetingsScreen from "@/features/my/HostedMeetingsScreen";

export default function MyHostedRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <HostedMeetingsScreen />
    </>
  );
}
