import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: "홈", tabBarIcon: ({ color, size }) => <MaterialIcons name="dashboard" color={color} size={size} /> }} />
      <Tabs.Screen name="map"   options={{ title: "맵", tabBarIcon: ({ color, size }) => <MaterialIcons name="map" color={color} size={size} /> }} />
      <Tabs.Screen name="chats" options={{ title: "모임", tabBarIcon: ({ color, size }) => <MaterialIcons name="chat" color={color} size={size} /> }} />
      <Tabs.Screen name="my"    options={{ title: "마이", tabBarIcon: ({ color, size }) => <MaterialIcons name="emoji-events" color={color} size={size} /> }} />
    </Tabs>
  );
}
