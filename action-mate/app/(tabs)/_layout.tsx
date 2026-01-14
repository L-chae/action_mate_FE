import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,      // 탭 내부 헤더 숨김
        title: "",               // 혹시 title 자동 노출 방지
        headerTitle: "",         // 안전장치
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "홈",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="dashboard" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "맵",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="map" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="dm"
        options={{
          title: "모임",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="message" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="my"
        options={{
          title: "마이",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="emoji-events" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
