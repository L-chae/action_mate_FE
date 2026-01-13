import React from "react";
import { View } from "react-native";
import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "~/shared/hooks/useAppTheme";
import { router } from "expo-router";
import { Fab } from "~/shared/ui/Fab";

export default function TabLayout() {
  const t = useAppTheme();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: t.colors.primary,
          tabBarInactiveTintColor: t.colors.textSub,
          tabBarStyle: {
            backgroundColor: t.colors.surface,
            borderTopColor: t.colors.border,
            borderTopWidth: 1,
            height: 68,
            paddingTop: 6,
            paddingBottom: 8,
          },
          tabBarLabelStyle: { fontSize: 12 },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "홈",
            tabBarIcon: ({ color }) => <MaterialIcons name="home-filled" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: "지도",
            tabBarIcon: ({ color }) => <MaterialIcons name="map" size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="my"
          options={{
            title: "마이",
            tabBarIcon: ({ color }) => <MaterialIcons name="person" size={24} color={color} />,
          }}
        />
      </Tabs>

      {/* ✅ 전역 FAB: 어디서든 모임 만들기 */}
      <Fab
        onPress={() => router.push("/meetups/create")}
        // 탭바 위로 살짝 올리고 싶으면 bottom 조절
        style={{ bottom: 84 }}
      />
    </View>
  );
}
