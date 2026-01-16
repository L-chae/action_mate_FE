// src/shared/hooks/useAppTheme.ts
import { useMemo } from "react";
import { useColorScheme } from "react-native";
import { ActionMateTheme, type AppTheme, type ThemeMode } from "@/shared/theme/appTheme";

/**
 * 시스템 다크모드만 따라가는 간단 훅
 * (추후 설정에서 강제 라이트/다크를 넣을 땐 Context/Store로 확장)
 */
export function useAppTheme(): AppTheme {
  const scheme = useColorScheme(); // "light" | "dark" | null

  const mode: ThemeMode = scheme === "dark" ? "dark" : "light";

  return useMemo(() => {
    return mode === "dark" ? ActionMateTheme.dark : ActionMateTheme.light;
  }, [mode]);
}
