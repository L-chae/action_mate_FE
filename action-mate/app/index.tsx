import { View, Image, StyleSheet } from "react-native";
import { useEffect } from "react";
import { router } from "expo-router";
import * as SplashScreen from "expo-splash-screen"; // ✅ 추가
import { useAuthStore } from "@/features/auth/model/authStore";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

export default function SplashScreenComponent() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const t = useAppTheme();

  useEffect(() => {
    // ✅ _layout.tsx에서 이미 hydrate가 끝난 상태로 렌더링됨
    // 따라서 hasHydrated 체크 불필요

    const performSplash = async () => {
      // 1. 최소 노출 시간 보장 (브랜딩용, 600ms)
      // 네이티브 스플래시가 아직 떠 있는 상태일 수 있음
      await new Promise((resolve) => setTimeout(resolve, 600));

      // 2. 네이티브 스플래시를 이 시점에 확실히 숨김 (자연스러운 전환)
      await SplashScreen.hideAsync();

      // 3. 페이지 이동
      router.replace(isLoggedIn ? "/(tabs)" : "/(auth)/login");
    };

    performSplash();
  }, [isLoggedIn]);

  return (
    <View style={[styles.container, { backgroundColor: t.colors.background }]}>
      {/* 이 이미지는 네이티브 스플래시(launch_screen)와 
        위치/크기가 정확히 일치하면 가장 자연스럽습니다.
      */}
      <Image
        source={require("../assets/images/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  logo: { width: 140, height: 140 },
});