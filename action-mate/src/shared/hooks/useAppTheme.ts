import { useMemo } from "react";
import { useColorScheme } from "react-native";
import { ActionMateTheme } from "../theme";

export function useAppTheme() {
  const scheme = useColorScheme(); // "light" | "dark" | null

  // ✅ 라이트 기본
  const mode = scheme === "dark" ? "dark" : "light";

  return useMemo(() => (mode === "dark" ? ActionMateTheme.dark : ActionMateTheme.light), [mode]);
}
