import "react-native-gesture-handler";
import "react-native-reanimated";

// Reactotron은 가능한 한 빨리 로드 (단, 위 2개 side-effect import는 최상단 유지)
if (__DEV__) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require("../src/shared/config/ReactotronConfig");
  } catch {
    // Reactotron 설정 파일이 없거나 경로가 다를 때 앱 셧다운 방지
  }
}

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import * as SplashScreen from "expo-splash-screen";
import { useAuthStore } from "@/features/auth/model/authStore";
import { StyleSheet } from "react-native";

// ✅ JS 로딩 전까지 네이티브 스플래시 화면 유지 (자동 숨김 방지)
void SplashScreen.preventAutoHideAsync().catch(() => {
  // 이미 preventAutoHideAsync가 호출된 경우 등에서 에러가 날 수 있어 방어
});

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const hydrate = useAuthStore((s) => s.hydrateFromStorage);

  useEffect(() => {
    let isMounted = true;

    async function prepare() {
      try {
        // ✅ 1. 스토어 복구 (await로 확실하게 기다림)
        await hydrate?.();
      } catch (e) {
        console.warn(e);
      } finally {
        if (isMounted) setIsReady(true);
      }
    }

    void prepare();

    return () => {
      isMounted = false;
    };
  }, [hydrate]);

  // ✅ 3. 레이아웃이 마운트될 때 스플래시 숨기기 (현재는 index.tsx에서 숨기는 흐름을 유지)
  const onLayoutRootView = useCallback(async () => {
    if (!isReady) return;
    // 필요 시 여기서 숨김:
    // await SplashScreen.hideAsync();
  }, [isReady]);

  // ✅ 준비 안 됐으면 아무것도 그리지 않음 (혹은 null)
  if (!isReady) return null;

  return (
    <GestureHandlerRootView style={styles.root} onLayout={onLayoutRootView}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="meetings/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="dm/[threadId]" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

// 요약1: gesture-handler/reanimated 최상단 유지한 채, 그 바로 아래에 ReactotronConfig를 dev에서만 require로 로드.
// 요약2: Reactotron 설정 누락/경로 오류 시 크래시 방지를 위해 try/catch 처리.
// 요약3: preventAutoHideAsync도 catch로 방어하고, 기존 스플래시 흐름(index.tsx에서 hide) 유지.