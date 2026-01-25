import React from "react";
import { Stack } from "expo-router";
import JoinedMeetingsScreen from "@/features/my/JoinedMeetingsScreen";

export default function MyJoinedRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <JoinedMeetingsScreen />
    </>
  );
}
