import "react-native-reanimated";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="meetings/[id]" options={{ headerShown: true, title: "모임 상세" }} />
      <Stack.Screen name="chat/[roomId]" options={{ headerShown: true, title: "모임방" }} />
    </Stack>
  );
}
