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
      {/* Main tabs: header OFF */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Detail screens */}
      <Stack.Screen name="meetings/[id]" options={{ title: "모임 상세" }} />
      <Stack.Screen name="dm/[threadId]" options={{ title: "모임방" }} />
    </Stack>
  );
}
