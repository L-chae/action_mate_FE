import React, { useMemo } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

export default function TabsLayout() {
  const t = useAppTheme();
  const insets = useSafeAreaInsets();

  const TAB_BAR_HEIGHT = 56;

  // ✅ Map/Chips와 통일: Ionicons + outline 톤
  const icons = useMemo(
    () => ({
      home: { on: "home", off: "home-outline" } as const,
      map: { on: "map", off: "map-outline" } as const,
      chat: { on: "chatbubbles", off: "chatbubbles-outline" } as const,
      my: { on: "person", off: "person-outline" } as const,
    }),
    []
  );

  const screenOptions = useMemo(
    () => ({
      headerShown: false,
      tabBarActiveTintColor: t.colors.primary,
      tabBarInactiveTintColor: t.colors.textSub,
      tabBarStyle: {
        backgroundColor: t.colors.background,
        borderTopColor: t.colors.border,
        height: TAB_BAR_HEIGHT + insets.bottom,
        paddingBottom: insets.bottom,
        paddingTop: 6,
      },
      tabBarHideOnKeyboard: true,
      // (선택) 라벨 스타일도 살짝 정돈하고 싶으면
      // tabBarLabelStyle: { fontSize: 11, marginTop: 2 },
    }),
    [t.colors.background, t.colors.border, t.colors.primary, t.colors.textSub, insets.bottom]
  );

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: "홈",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? icons.home.on : icons.home.off}
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="map"
        options={{
          title: "지도",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? icons.map.on : icons.map.off}
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="dm"
        options={{
          title: "채팅",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? icons.chat.on : icons.chat.off}
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="my"
        options={{
          title: "마이페이지",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? icons.my.on : icons.my.off}
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
