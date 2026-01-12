import { useMemo } from "react";
import { useColorScheme } from "react-native";
import { ActionMateTheme, type ThemeMode, type AppTheme } from "../theme";

export function useAppTheme(): AppTheme {
  const scheme = useColorScheme(); // "light" | "dark" | null

  const mode: ThemeMode = scheme === "dark" ? "dark" : "light";

  return useMemo(() => ActionMateTheme[mode], [mode]);
}
