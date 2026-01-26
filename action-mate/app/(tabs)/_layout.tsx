import React from "react";
import { Tabs, Redirect, useSegments } from "expo-router"; 
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/shared/hooks/useAppTheme";
import { useAuthStore } from "@/features/auth/model/authStore";

const TAB_BAR_HEIGHT = 56;

export default function TabsLayout() {
  const t = useAppTheme();
  const insets = useSafeAreaInsets();
  
  // ✅ [수정] 반환값을 string[]으로 강제하여 TypeScript 오류 해결
  const segments = useSegments() as string[]; 

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  // 이제 includes 메서드가 정상적으로 작동합니다.
  const hideTabBar = segments.includes("hosted") || segments.includes("joined");

  if (!hasHydrated) return null;
  if (!isLoggedIn) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.colors.primary,
        tabBarInactiveTintColor: t.colors.textSub,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: t.colors.background,
          borderTopColor: t.colors.border,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
          // 조건부 스타일 적용
          display: hideTabBar ? "none" : "flex", 
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "홈",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: "지도",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "location" : "location-outline"} color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="dm"
        options={{
          title: "채팅",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "chatbubble" : "chatbubble-outline"} color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="my"
        options={{
          title: "마이페이지",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person-circle" : "person-circle-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}