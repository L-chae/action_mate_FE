import "react-native-reanimated";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      {/* 탭 그룹은 헤더 숨김 */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* 모달/서브 화면들은 헤더 사용 */}
      <Stack.Screen name="(modals)" options={{ headerShown: true }} />

      {/* 기존 상세 화면들(원하면 여기 두고 headerShown 켜도 OK) */}
      <Stack.Screen
        name="meetings/[id]"
        options={{ headerShown: true, title: "모임 상세" }}
      />
      <Stack.Screen name="dm/[threadId]" options={{ headerShown: true, title: "모임방" }} />
    </Stack>
  );
}
