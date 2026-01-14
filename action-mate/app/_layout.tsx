import "react-native-reanimated";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // ✅ 전 화면 헤더(경로 표시 포함) 완전 OFF
      }}
    >
      {/* 탭 그룹 */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* auth 그룹도 보통 헤더 숨김 */}
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />

      {/* 루트 modal.tsx (Expo Router 기본 모달 라우트) */}
      <Stack.Screen name="modal" options={{ presentation: "modal", headerShown: false }} />

      {/* 원래 켜두던 상세 화면들도 전부 끔 */}
      <Stack.Screen name="meetings/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="dm/[threadId]" options={{ headerShown: false }} />
    </Stack>
  );
}
