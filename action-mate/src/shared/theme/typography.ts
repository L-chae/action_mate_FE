// src/shared/theme/typography.ts

import type { TextStyle } from "react-native";

/**
 * ✅ Typography tokens
 *
 * 목적
 * - 폰트 크기/라인하이트/굵기를 컴포넌트에서 매번 계산하지 않도록 통일
 * - 초반 앱에서 "텍스트 위계(큰 제목/본문/라벨)"만 잡아도 디자인 완성도가 크게 올라감
 *
 * 호환성 원칙
 * - Typo 구조/키 유지 (이미 적용된 화면 영향 없음)
 * - 숫자(폰트 사이즈/라인하이트/굵기) 변경 없음
 */

export type Typo = {
  displayLarge: TextStyle;
  displayMedium: TextStyle;
  displaySmall: TextStyle;

  headlineLarge: TextStyle;
  headlineMedium: TextStyle;
  headlineSmall: TextStyle;

  titleLarge: TextStyle;
  titleMedium: TextStyle;
  titleSmall: TextStyle;

  bodyLarge: TextStyle;
  bodyMedium: TextStyle;
  bodySmall: TextStyle;

  labelLarge: TextStyle;
  labelMedium: TextStyle;
  labelSmall: TextStyle;
};

/**
 * weight 토큰
 * - 숫자 문자열로 고정해두면 OS/폰트에 따라 예측 가능한 결과가 나옴
 * - (Pretendard Variable 같은 경우는 더 유연하지만, 토큰은 단순한 게 유지보수에 유리)
 */
const weight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

type TypographyParams = {
  /**
   * main/sub는 색상만 받아서 텍스트 스타일에 주입
   * - 테마(라이트/다크) 바뀔 때 typography를 그대로 재생성할 수 있게 분리
   */
  main: string;
  sub: string;

  /**
   * fontFamily: 하나의 패밀리만 쓰는 경우
   * - 안드/iOS 기본 폰트를 쓰면 생략 가능
   */
  fontFamily?: string;

  /**
   * fontFamilyByWeight: 굵기별 별도 폰트 파일을 쓰는 경우(레거시/커스텀 폰트)
   * - Pretendard Variable처럼 weight를 한 파일로 커버하면 없어도 됨
   */
  fontFamilyByWeight?: Partial<Record<keyof typeof weight, string>>;
};

/**
 * 폰트패밀리 매핑
 * - "굵기별 다른 파일"이 있는 앱에서만 분기
 * - 없으면 단일 fontFamily 또는 기본 폰트 사용
 *
 * 왜 이렇게?
 * - RN에서 fontWeight + fontFamily 조합이 폰트별로 다르게 동작할 수 있어
 *   굵기별 파일을 쓰는 경우 명시적으로 매핑해주는 게 안전함
 */
function ffStyle(
  params: TypographyParams,
  w: keyof typeof weight
): Pick<TextStyle, "fontFamily"> | {} {
  if (params.fontFamilyByWeight?.[w]) return { fontFamily: params.fontFamilyByWeight[w] };
  if (params.fontFamily) return { fontFamily: params.fontFamily };
  return {};
}

/**
 * Typography 생성기
 * - main/sub 색상을 주입해 텍스트 토큰 세트를 만든다
 * - 테마 변경 시 "색상만 바뀐 typography"를 동일 규칙으로 재생성 가능
 */
export function createTypography(params: TypographyParams): Typo {
  const { main, sub } = params;

  return {
    // Display: 랜딩/큰 헤더 (자주 쓰지 않더라도 기준점이 있으면 좋음)
    displayLarge: {
      ...ffStyle(params, "bold"),
      fontSize: 57,
      lineHeight: 57 * 1.12,
      fontWeight: weight.bold,
      color: main,
    },
    displayMedium: {
      ...ffStyle(params, "bold"),
      fontSize: 45,
      lineHeight: 45 * 1.16,
      fontWeight: weight.bold,
      color: main,
    },
    displaySmall: {
      ...ffStyle(params, "bold"),
      fontSize: 36,
      lineHeight: 36 * 1.22,
      fontWeight: weight.bold,
      color: main,
    },

    // Headline: 섹션 타이틀/페이지 헤더
    headlineLarge: {
      ...ffStyle(params, "bold"),
      fontSize: 32,
      lineHeight: 32 * 1.25,
      fontWeight: weight.bold,
      color: main,
    },
    headlineMedium: {
      ...ffStyle(params, "bold"),
      fontSize: 28,
      lineHeight: 28 * 1.29,
      fontWeight: weight.bold,
      color: main,
    },
    headlineSmall: {
      ...ffStyle(params, "bold"),
      fontSize: 24,
      lineHeight: 24 * 1.33,
      fontWeight: weight.bold,
      color: main,
    },

    // Title: 카드/리스트 아이템 제목
    titleLarge: {
      ...ffStyle(params, "bold"),
      fontSize: 22,
      lineHeight: 22 * 1.27,
      fontWeight: weight.bold,
      color: main,
    },
    titleMedium: {
      ...ffStyle(params, "semibold"),
      fontSize: 16,
      lineHeight: 16 * 1.5,
      fontWeight: weight.semibold,
      color: main,
    },
    titleSmall: {
      ...ffStyle(params, "semibold"),
      fontSize: 14,
      lineHeight: 14 * 1.43,
      fontWeight: weight.semibold,
      color: main,
    },

    // Body: 본문/설명 텍스트
    bodyLarge: {
      ...ffStyle(params, "regular"),
      fontSize: 16,
      lineHeight: 16 * 1.5,
      fontWeight: weight.regular,
      color: main,
    },
    bodyMedium: {
      ...ffStyle(params, "regular"),
      fontSize: 14,
      lineHeight: 14 * 1.43,
      fontWeight: weight.regular,
      color: main,
    },
    bodySmall: {
      ...ffStyle(params, "regular"),
      fontSize: 12,
      lineHeight: 12 * 1.33,
      fontWeight: weight.regular,
      // bodySmall은 "설명/보조"로 쓰는 경우가 많아 sub 색상을 기본으로 둠
      color: sub,
    },

    // Label: 버튼/칩/작은 UI 텍스트
    labelLarge: {
      ...ffStyle(params, "semibold"),
      fontSize: 14,
      lineHeight: 14 * 1.43,
      fontWeight: weight.semibold,
      color: main,
    },
    labelMedium: {
      ...ffStyle(params, "semibold"),
      fontSize: 12,
      lineHeight: 12 * 1.33,
      fontWeight: weight.semibold,
      color: main,
    },
    labelSmall: {
      ...ffStyle(params, "medium"),
      fontSize: 11,
      lineHeight: 11 * 1.27,
      fontWeight: weight.medium,
      color: sub,
    },
  };
}