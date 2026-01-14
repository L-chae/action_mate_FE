import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useAppTheme } from "@/shared/hooks/useAppTheme";

export default function TabsLayout() {
  const theme = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        // ✅ active(선택됨) 아이콘/라벨 색
        tabBarActiveTintColor: theme.colors.primary,

        // ✅ inactive(비선택) 아이콘/라벨 색 (sub 텍스트 톤 쓰면 자연스러움)
        tabBarInactiveTintColor: theme.colors.textSub,

        // (선택) 탭바 배경/보더도 테마에 맞춤
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "홈",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="dashboard" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "맵",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="map" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="dm"
        options={{
          title: "모임",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="message" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="my"
        options={{
          title: "마이",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="emoji-events" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
