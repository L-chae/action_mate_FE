// src/shared/theme/appTheme.ts
import { colors, buildThemeColors, withAlpha } from "./colors";
import { spacing } from "./spacing";
import { createTypography } from "./typography";

export type ThemeMode = "light" | "dark";

export function createTheme(mode: ThemeMode) {
  const isDark = mode === "dark";

  // ✅ 핵심: 라이트/다크에 맞는 ThemeColors(semantic 포함)를 colors.ts에서 생성
  const themeColors = buildThemeColors(mode);

  // ✅ disabled는 textMain 기반으로 일관되게
  const disabledFg = withAlpha(themeColors.textMain, 0.38);
  const disabledBg = withAlpha(themeColors.textMain, isDark ? 0.10 : 0.12);

  // ✅ 모달/바텀시트 배경용 "scrim"은 textMain overlay와 성격이 달라서 별도 토큰 추천
  // (기존 overlay가 이 역할이었다면 이름만 바꾸는 게 안전)
  const scrim = withAlpha("#000000", isDark ? 0.6 : 0.35);

  // ✅ placeholder는 overlay 토큰에 35가 없으니 여기서 계산(또는 colors.ts에 overlay[35] 추가해도 됨)
  const placeholder = withAlpha(themeColors.textMain, 0.35);

  // ✅ card/chip은 기존 의도를 유지
  const card = themeColors.surface;
  const chipBg = isDark ? themeColors.neutral[800] : themeColors.neutral[100];
  const chipText = themeColors.textSub;

  const typography = createTypography({
    main: themeColors.textMain,
    sub: themeColors.textSub,
    fontFamily: "Pretendard",
  });

  const shadow = {
    elevationSm: 2,
    elevationMd: 6,
    elevationLg: 12,
  } as const;

  return {
    mode,
    colors: {
      // ✅ 기존 raw colors도 유지(혹시 primaryLight 등 쓰는 곳 깨질 수 있어서)
      ...colors,

      // ✅ 실제 화면에서 쓸 컬러(semantic 포함)
      ...themeColors,

      // ✅ 앱 레벨에서 자주 쓰는 파생 토큰
      disabledFg,
      disabledBg,
      placeholder,
      card,
      chipBg,
      chipText,

      // ✅ 기존 overlay 역할 대체(모달 뒤 배경)
      scrim,
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
