import { useColorScheme } from "react-native";
import { ActionMateTheme, type AppTheme } from "../theme/appTheme";

/**
 * 초반엔 Context 없이도 충분: 시스템 다크모드만 따라감
 * (나중에 설정에서 다크/라이트 토글 필요하면 ThemeProvider로 확장)
 */
export function useAppTheme(): AppTheme {
  const scheme = useColorScheme(); // "light" | "dark" | null
  return scheme === "dark" ? ActionMateTheme.dark : ActionMateTheme.light;
}
