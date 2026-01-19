import React from "react";
import { Stack } from "expo-router";
import ManageParticipantsScreen from "@/features/meetings/ManageParticipantsScreen";

/**
 * 참여자 관리 페이지 진입점
 * - 경로: /meetings/manage/[id]
 */
export default function ManageParticipantsRoute() {
  return (
    <>
      {/* 기본 헤더를 숨기고 커스텀 TopBar 사용 */}
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* 실제 관리 로직이 담긴 스크린 컴포넌트 호출 */}
      <ManageParticipantsScreen />
    </>
  );
}