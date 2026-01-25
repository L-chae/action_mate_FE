import { Stack } from 'expo-router';

export default function MyLayout() {
  return (
    <Stack
      screenOptions={{
        // 1. 네이티브 헤더 숨김 (커스텀 TopBar 사용)
        headerShown: false,
        
        // 2. [수정] 강제 애니메이션 설정 제거 -> 시스템 기본값 사용
        // animation: 'slide_from_right', 
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="hosted" />
      <Stack.Screen name="joined" />
    </Stack>
  );
}