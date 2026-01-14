// app/index.tsx
import { View, Image, StyleSheet } from "react-native";
import { useEffect } from "react";
import { router } from "expo-router";
import { useAuthStore } from "@/features/auth/authStore";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

export default function SplashScreen() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const t = useAppTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoggedIn) {
        // ✅ 그룹 경로("/(tabs)") 대신 실제 라우트로 이동
        router.replace("/");
      } else {
        router.replace("/(auth)/login");
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [isLoggedIn]);

  return (
    <View style={[styles.container, { backgroundColor: t.colors.background }]}>
      <Image
        source={require("../assets/images/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 140,
    height: 140,
  },
});
