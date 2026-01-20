// app/(auth)/email-login.tsx
import React from "react";
import { Stack } from "expo-router";
import IdLoginScreen from "@/features/auth/IdLoginScreen";

export default function IdLoginRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <IdLoginScreen />
    </>
  );
}