// app/_layout.tsx
import "react-native-gesture-handler"; // ✅ 반드시 파일 최상단
import "react-native-reanimated";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/model/authStore";

export default function RootLayout() {
  useEffect(() => {
    // ✅ 1회만 실행 + promise 미처리 경고 방지
    void useAuthStore.getState().hydrateFromStorage();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Auth group */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />

        {/* Main tabs */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Detail screens */}
        <Stack.Screen name="meetings/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="dm/[threadId]" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}