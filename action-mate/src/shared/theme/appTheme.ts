// src/shared/theme/appTheme.ts
import { colors } from "./colors";
import { spacing } from "./spacing";
import { createTypography } from "./typography";

export type ThemeMode = "light" | "dark";

// NEW: hex -> rgba 유틸 (간단 버전)
function withAlpha(hex: string, alpha: number) {
  // "#RRGGBB"만 지원 (필요하면 확장 가능)
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function createTheme(mode: ThemeMode) {
  const isDark = mode === "dark";

  // Base (기존 유지)
  const background = isDark ? colors.backgroundDark : colors.backgroundLight;
  const surface = isDark ? colors.surfaceDark : colors.surfaceLight;
  const textMain = isDark ? colors.textMainDark : colors.textMainLight;
  const textSub = isDark ? colors.textSubDark : colors.textSubLight;
  const border = isDark ? colors.borderDark : colors.borderLight;

  // Disabled (기존보다 일관성 있게)
  const disabledFg = withAlpha(textMain, 0.38);
  const disabledBg = withAlpha(textMain, isDark ? 0.10 : 0.12);

  // NEW: semantic tokens (현업에서 제일 유용)
  const overlay = withAlpha("#000000", isDark ? 0.6 : 0.35);
  const divider = border;
  const placeholder = withAlpha(textMain, 0.35);

  const card = surface; // 추후 따로 분리 가능
  const chipBg = isDark ? withAlpha(colors.primary, 0.18) : colors.primaryLight;
  const chipText = colors.primary;

  const typography = createTypography({
    main: textMain,
    sub: textSub,
    fontFamily: "Pretendard",
  });

  // NEW: shadow token (iOS/Android 차이는 컴포넌트에서 처리해도 됨)
  const shadow = {
    // react-native iOS shadow props + android elevation을 함께 쓰는 패턴을 위한 값
    elevationSm: 2,
    elevationMd: 6,
    elevationLg: 12,
  } as const;

  return {
    mode,
    colors: {
      ...colors,

      // existing mapped
      background,
      surface,
      textMain,
      textSub,
      border,
      disabledFg,
      disabledBg,

      // NEW semantic
      overlay,
      divider,
      placeholder,
      card,
      chipBg,
      chipText,
    },
    spacing,
    typography,
    shadow,
  } as const;
}

export const ActionMateTheme = {
  light: createTheme("light"),
  dark: createTheme("dark"),
} as const;

export type AppTheme = ReturnType<typeof createTheme>;
