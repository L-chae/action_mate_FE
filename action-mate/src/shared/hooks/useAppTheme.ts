// src/shared/hooks/useAppTheme.ts
import { useMemo } from "react";
import { useColorScheme } from "react-native";
import { ActionMateTheme, type AppTheme, type ThemeMode } from "../theme/appTheme";

/**
 * 초반엔 Context 없이도 충분: 시스템 다크모드만 따라감
 * (나중에 설정에서 다크/라이트 토글 필요하면 ThemeProvider로 확장)
 */
export function useAppTheme(): AppTheme {
  const scheme = useColorScheme(); // "light" | "dark" | null

  // null이면(웹/일부 상황) 라이트로 폴백
  const mode: ThemeMode = scheme === "dark" ? "dark" : "light";

  // 지금은 상수 테마지만, 나중에 동적 생성으로 바뀌어도 안전하게 memo
  return useMemo(() => (mode === "dark" ? ActionMateTheme.dark : ActionMateTheme.light), [mode]);
}
