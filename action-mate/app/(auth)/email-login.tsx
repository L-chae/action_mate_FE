// app/(auth)/email-login.tsx
import React from "react";
import { Stack } from "expo-router";
import EmailLoginScreen from "@/features/auth/EmailLoginScreen";

export default function EmailLoginRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <EmailLoginScreen />
    </>
  );
}