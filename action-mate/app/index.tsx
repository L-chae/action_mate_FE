// app/index.tsx
import { View, Image, StyleSheet } from "react-native";
import { useEffect } from "react";
import { router } from "expo-router";
import { useAuthStore } from "@/features/auth/authStore";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

export default function SplashScreen() {
  const { isLoggedIn } = useAuthStore();
  const t = useAppTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoggedIn) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(auth)/login");
      }
    }, 1500); // ⏱ 1.5초

    return () => clearTimeout(timer);
  }, [isLoggedIn]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: t.colors.background },
      ]}
    >
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
