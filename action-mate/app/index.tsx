import { View, Image, StyleSheet } from "react-native";
import { useEffect } from "react";
import { router } from "expo-router";
import { useAuthStore } from "@/features/auth/model/authStore";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

export default function SplashScreen() {
  // ✅ 객체 반환 selector 금지 -> 원시값 selector로 분리
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  const t = useAppTheme();

  useEffect(() => {
    if (!hasHydrated) return;

    const timer = setTimeout(() => {
      router.replace(isLoggedIn ? "/(tabs)" : "/(auth)/login");
    }, 600);

    return () => clearTimeout(timer);
  }, [isLoggedIn, hasHydrated]);

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
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  logo: { width: 140, height: 140 },
});
