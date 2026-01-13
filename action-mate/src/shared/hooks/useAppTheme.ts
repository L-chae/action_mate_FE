<<<<<<< Updated upstream
import { useMemo } from "react";
import { useColorScheme } from "react-native";
import { ActionMateTheme, type ThemeMode, type AppTheme } from "../theme";
=======
import { useColorScheme } from "react-native";
import { ActionMateTheme, type AppTheme } from "../theme/appTheme";
>>>>>>> Stashed changes

export function useAppTheme(): AppTheme {
  const scheme = useColorScheme(); // "light" | "dark" | null
<<<<<<< Updated upstream

  const mode: ThemeMode = scheme === "dark" ? "dark" : "light";

  return useMemo(() => ActionMateTheme[mode], [mode]);
=======
  return scheme === "dark" ? ActionMateTheme.dark : ActionMateTheme.light;
>>>>>>> Stashed changes
}
