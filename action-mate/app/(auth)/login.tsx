// app/(auth)/login.tsx
import React from "react";
import { Stack } from "expo-router";
import LoginScreen from "@/features/auth/LoginScreen";
export default function LoginRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <LoginScreen />
    </>
  );
}