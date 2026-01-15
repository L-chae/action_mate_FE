import "react-native-reanimated";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/authStore";

export default function RootLayout() {
  useEffect(() => {
    // ✅ zustand selector로 함수 구독하지 말고, 스토어에서 직접 1회 호출
    useAuthStore.getState().hydrateFromStorage();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Main tabs */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Detail screens (헤더는 앱 내부 TopBar로 처리) */}
      <Stack.Screen name="meetings/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="dm/[threadId]" options={{ headerShown: false }} />
    </Stack>
  );
}
