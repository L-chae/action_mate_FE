import "react-native-reanimated";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        // ✅ 자동 경로 타이틀 차단
        headerTitle: "",
        headerBackTitle: "",
        headerShown: true, // 기본은 켜두되 title은 비워둠
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(modals)" options={{ headerShown: true }} />

      {/* 상세 */}
      <Stack.Screen name="meetings/[id]" options={{ headerShown: true, title: "모임 상세" }} />
      <Stack.Screen name="dm/[threadId]" options={{ headerShown: true, title: "모임방" }} />

      {/* ✅ 안전장치: 나머지 화면도 title 자동표시 방지 */}
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
