import "react-native-reanimated";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: "", // ✅ iOS back 텍스트 제거
      }}
    >
      {/* Main tabs: header OFF */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />


      {/* Detail screens */}
      <Stack.Screen name="meetings/[id]" options={{ title: "모임 상세" }} />
      <Stack.Screen name="dm/[threadId]" options={{ title: "모임방" }} />
    </Stack>
  );
}
