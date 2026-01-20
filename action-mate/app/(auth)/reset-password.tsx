// app/(auth)/reset-password.tsx
import React from "react";
import ResetPasswordScreen from "@/features/auth/ResetPasswordScreen";

/**
 * ✅ 개선 포인트
 * - ResetPasswordScreen 내부에 TopBar가 이미 있으므로 Stack header는 숨김 처리
 * - 다른 auth 라우트들도 같은 패턴(스크린이 TopBar 렌더링)으로 맞추면 중복 제거/일관성↑
 */
export default function ResetPasswordRoute() {
  return (
    <>
      {/* Screen 내부 TopBar 사용 */}
      <ResetPasswordScreen />
    </>
  );
}