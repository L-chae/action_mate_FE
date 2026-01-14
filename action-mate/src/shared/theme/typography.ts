// src/shared/theme/typography.ts
import type { TextStyle } from "react-native";

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

// NEW: weight 토큰(재사용)
const weight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

type TypographyParams = {
  main: string;
  sub: string;
  fontFamily?: string;
  // NEW: 필요 시 weight별 폰트패밀리 대응 (Pretendard Variable 쓰면 안 써도 됨)
  fontFamilyByWeight?: Partial<Record<keyof typeof weight, string>>;
};

function ffStyle(params: TypographyParams, w: keyof typeof weight): Pick<TextStyle, "fontFamily"> | {} {
  if (params.fontFamilyByWeight?.[w]) return { fontFamily: params.fontFamilyByWeight[w] };
  if (params.fontFamily) return { fontFamily: params.fontFamily };
  return {};
}

export function createTypography(params: TypographyParams): Typo {
  const { main, sub } = params;

  return {
    displayLarge: { ...ffStyle(params, "bold"), fontSize: 57, lineHeight: 57 * 1.12, fontWeight: weight.bold, color: main },
    displayMedium: { ...ffStyle(params, "bold"), fontSize: 45, lineHeight: 45 * 1.16, fontWeight: weight.bold, color: main },
    displaySmall: { ...ffStyle(params, "bold"), fontSize: 36, lineHeight: 36 * 1.22, fontWeight: weight.bold, color: main },

    headlineLarge: { ...ffStyle(params, "bold"), fontSize: 32, lineHeight: 32 * 1.25, fontWeight: weight.bold, color: main },
    headlineMedium: { ...ffStyle(params, "bold"), fontSize: 28, lineHeight: 28 * 1.29, fontWeight: weight.bold, color: main },
    headlineSmall: { ...ffStyle(params, "bold"), fontSize: 24, lineHeight: 24 * 1.33, fontWeight: weight.bold, color: main },

    titleLarge: { ...ffStyle(params, "bold"), fontSize: 22, lineHeight: 22 * 1.27, fontWeight: weight.bold, color: main },
    titleMedium: { ...ffStyle(params, "semibold"), fontSize: 16, lineHeight: 16 * 1.5, fontWeight: weight.semibold, color: main },
    titleSmall: { ...ffStyle(params, "semibold"), fontSize: 14, lineHeight: 14 * 1.43, fontWeight: weight.semibold, color: main },

    bodyLarge: { ...ffStyle(params, "regular"), fontSize: 16, lineHeight: 16 * 1.5, fontWeight: weight.regular, color: main },
    bodyMedium: { ...ffStyle(params, "regular"), fontSize: 14, lineHeight: 14 * 1.43, fontWeight: weight.regular, color: main },
    bodySmall: { ...ffStyle(params, "regular"), fontSize: 12, lineHeight: 12 * 1.33, fontWeight: weight.regular, color: sub },

    labelLarge: { ...ffStyle(params, "semibold"), fontSize: 14, lineHeight: 14 * 1.43, fontWeight: weight.semibold, color: main },
    labelMedium: { ...ffStyle(params, "semibold"), fontSize: 12, lineHeight: 12 * 1.33, fontWeight: weight.semibold, color: main },
    labelSmall: { ...ffStyle(params, "medium"), fontSize: 11, lineHeight: 11 * 1.27, fontWeight: weight.medium, color: sub },
  };
}
