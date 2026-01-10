import { colors } from "./colors";
import { spacing } from "./spacing";
import { createTypography } from "./typography";

export type ThemeMode = "light" | "dark";

export function createTheme(mode: ThemeMode) {
  const isDark = mode === "dark";

  const background = isDark ? colors.backgroundDark : colors.backgroundLight;
  const surface = isDark ? colors.surfaceDark : colors.surfaceLight;
  const textMain = isDark ? colors.textMainDark : colors.textMainLight;
  const textSub = isDark ? colors.textSubDark : colors.textSubLight;
  const border = isDark ? colors.borderDark : colors.borderLight;

  const disabledFg = isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.38)";
  const disabledBg = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.12)";

  const typography = createTypography({
    main: textMain,
    sub: textSub,
    fontFamily: "Pretendard", // 폰트 넣을 계획이면 유지, 아니면 지워도 됨
  });

  return {
    mode,
    colors: {
      ...colors,
      background,
      surface,
      textMain,
      textSub,
      border,
      disabledFg,
      disabledBg,
    },
    spacing,
    typography,
  } as const;
}

export const ActionMateTheme = {
  light: createTheme("light"),
  dark: createTheme("dark"),
} as const;

export type AppTheme = ReturnType<typeof createTheme>;
