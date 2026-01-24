import "react-native-gesture-handler";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import * as SplashScreen from "expo-splash-screen"; // ✅ 추가: 스플래시 제어
import { useAuthStore } from "@/features/auth/model/authStore";
import { View } from "react-native";

// ✅ JS 로딩 전까지 네이티브 스플래시 화면 유지 (자동 숨김 방지)
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);

  useEffect(() => {
    async function prepare() {
      try {
        // ✅ 1. 스토어 복구 (await로 확실하게 기다림)
        await hydrate();
        
        // (선택) 폰트 로딩이나 기타 필수 비동기 작업도 여기서 await
        // await Font.loadAsync(...) 
      } catch (e) {
        console.warn(e);
      } finally {
        // ✅ 2. 준비 완료 신호
        setIsReady(true);
      }
    }

    prepare();
  }, []);

  // ✅ 3. 레이아웃이 마운트될 때 스플래시 숨기기
  const onLayoutRootView = useCallback(async () => {
    if (isReady) {
      // 준비가 다 되었을 때 네이티브 스플래시를 숨김
      // (만약 애니메이션이 있는 커스텀 SplashScreen을 쓴다면 이 줄을 제거하고 그 파일에서 숨겨야 함)
      // 여기서는 "SplashScreen.tsx"가 따로 있으므로, 네이티브 화면은 바로 숨기지 않고
      // 자연스럽게 넘어가도록 둡니다. (아래 설명 참조)
    }
  }, [isReady]);

  // ✅ 준비 안 됐으면 아무것도 그리지 않음 (혹은 null)
  if (!isReady) {
    return null; 
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* index.tsx가 스플래시 역할을 하므로 초기 라우트로 잡힘.
           여기서 (auth)나 (tabs)로 바로 보내지 않고, 스택 흐름을 따름 
        */}
        <Stack.Screen name="index" options={{ headerShown: false }} /> 
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="meetings/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="dm/[threadId]" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}