// src/shared/theme/appTheme.ts

/**
 * ✅ App Theme (최종 조립 레이어)
 *
 * 역할
 * - colors.ts: "색상 원본 + semantic 토큰 생성" (ThemeColors)
 * - typography.ts: "텍스트 스타일 토큰 생성"
 * - spacing.ts: "간격/라운드/모션 토큰"
 * - appTheme.ts: 위 토큰들을 한 번에 묶어서 "앱에서 쓰는 theme 객체"로 제공
 *
 * 목표(이미 사용 중인 코드 영향 최소화)
 * - 반환 구조/키 유지: theme.colors에 raw + semantic + 파생 토큰을 그대로 제공
 * - 기존 컴포넌트가 colors.primaryLight 등 raw를 쓰고 있어도 깨지지 않게 유지
 * - disabled/placeholder/scrim 등 "앱 전역에서 자주 쓰는 파생 값"은 여기서만 계산
 */

import { colors, buildThemeColors, withAlpha } from "./colors";
import { spacing } from "./spacing";
import { createTypography } from "./typography";

export type ThemeMode = "light" | "dark";

export function createTheme(mode: ThemeMode) {
  const isDark = mode === "dark";

  /**
   * 1) ThemeColors 생성
   * - light/dark에 맞춘 semantic 토큰(배경/텍스트/상태색/overlay 등)
   * - 세부 로직은 colors.ts에 몰아두고 여기서는 "조립"만 담당
   */
  const themeColors = buildThemeColors(mode);

  /**
   * 2) 파생 토큰(앱 레벨)
   *
   * 왜 여기서 계산하나?
   * - 팀이 초기에 가장 많이 쓰는 값들을 "theme.colors.xxx"로 바로 쓰게 해서
   *   컴포넌트에서 withAlpha를 매번 호출하지 않도록 하기 위함
   * - 이미 사용 중인 키(disabledFg/disabledBg/placeholder 등) 유지
   */

  // 비활성화 전경색: textMain 톤을 기준으로 통일 (버튼/아이콘/텍스트 공통)
  const disabledFg = withAlpha(themeColors.textMain, 0.38);

  // 비활성화 배경: 다크는 너무 밝게 뜨지 않도록 약하게, 라이트는 살짝 더 보이게
  const disabledBg = withAlpha(themeColors.textMain, isDark ? 0.10 : 0.12);

  /**
   * Scrim: 모달/바텀시트 뒤 배경
   * - overlay(textMain 기반)와 목적이 다르므로 별도 토큰으로 유지하는 편이 안전
   * - 이미 사용 중인 "scrim" 키를 유지 (컴포넌트 영향 최소화)
   */
  const scrim = withAlpha("#000000", isDark ? 0.6 : 0.35);

  /**
   * Placeholder: 입력창 placeholder 텍스트
   * - overlay에 35 단계가 없으면 여기서 계산
   * - (원하면 colors.ts에 overlay[35]를 추가하고 여기 값을 교체해도 되지만,
   *   지금은 "기존 구조 유지"가 우선이라 그대로 둠)
   */
  const placeholder = withAlpha(themeColors.textMain, 0.35);

  /**
   * Card / Chip
   * - 카드 배경은 surface를 그대로 사용
   * - 칩은 neutral로 단순히 처리(초기 앱에서 가장 예측 가능)
   */
  const card = themeColors.surface;

  // chipBg/chipText는 themeColors에 이미 비슷한 토큰이 있어도,
  // 현재 앱에서 이 키를 직접 쓰고 있을 가능성이 높아 "동일 키 유지" 목적
  const chipBg = isDark ? themeColors.neutral[800] : themeColors.neutral[100];
  const chipText = themeColors.textSub;

  /**
   * 3) Typography 생성
   * - themeColors의 textMain/textSub를 주입해서 모드에 따라 자동으로 색상 반영
   * - 폰트 패밀리는 앱에서 사용하는 값 유지 (Pretendard)
   */
  const typography = createTypography({
    main: themeColors.textMain,
    sub: themeColors.textSub,
    fontFamily: "Pretendard",
  });

  /**
   * 4) Shadow(수치 토큰)
   * - iOS/Android 구현 방식이 다르기 때문에 "레벨 값"만 토큰화
   * - 실제 스타일 적용 시 플랫폼별 처리는 컴포넌트/유틸에서 수행
   */
  const shadow = {
    elevationSm: 2,
    elevationMd: 6,
    elevationLg: 12,
  } as const;

  /**
   * 5) 반환 theme
   * - colors: raw(colors.ts의 colors) + semantic(buildThemeColors) + app-level derived
   * - 기존 코드에서 colors.primaryLight 같은 raw를 직접 사용해도 깨지지 않도록 병합 순서 유지
   */
  return {
    mode,
    colors: {
      // ✅ raw palette 유지 (기존 사용처 호환)
      ...colors,

      // ✅ semantic tokens (background/text/overlay 등)
      ...themeColors,

      // ✅ app-level derived tokens (자주 쓰는 값들)
      disabledFg,
      disabledBg,
      placeholder,
      card,
      chipBg,
      chipText,

      // ✅ modal/backdrop
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