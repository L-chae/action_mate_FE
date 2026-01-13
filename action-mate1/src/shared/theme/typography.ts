import type { TextStyle } from "react-native";

type Typo = {
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

export function createTypography(params: { main: string; sub: string; fontFamily?: string }): Typo {
  const { main, sub, fontFamily } = params;
  const ff = fontFamily ? { fontFamily } : undefined;

  return {
    displayLarge: { ...ff, fontSize: 57, lineHeight: 57 * 1.12, fontWeight: "700", color: main },
    displayMedium: { ...ff, fontSize: 45, lineHeight: 45 * 1.16, fontWeight: "700", color: main },
    displaySmall: { ...ff, fontSize: 36, lineHeight: 36 * 1.22, fontWeight: "700", color: main },

    headlineLarge: { ...ff, fontSize: 32, lineHeight: 32 * 1.25, fontWeight: "700", color: main },
    headlineMedium: { ...ff, fontSize: 28, lineHeight: 28 * 1.29, fontWeight: "700", color: main },
    headlineSmall: { ...ff, fontSize: 24, lineHeight: 24 * 1.33, fontWeight: "700", color: main },

    titleLarge: { ...ff, fontSize: 22, lineHeight: 22 * 1.27, fontWeight: "700", color: main },
    titleMedium: { ...ff, fontSize: 16, lineHeight: 16 * 1.5, fontWeight: "600", color: main },
    titleSmall: { ...ff, fontSize: 14, lineHeight: 14 * 1.43, fontWeight: "600", color: main },

    bodyLarge: { ...ff, fontSize: 16, lineHeight: 16 * 1.5, fontWeight: "400", color: main },
    bodyMedium: { ...ff, fontSize: 14, lineHeight: 14 * 1.43, fontWeight: "400", color: main },
    bodySmall: { ...ff, fontSize: 12, lineHeight: 12 * 1.33, fontWeight: "400", color: sub },

    labelLarge: { ...ff, fontSize: 14, lineHeight: 14 * 1.43, fontWeight: "600", color: main },
    labelMedium: { ...ff, fontSize: 12, lineHeight: 12 * 1.33, fontWeight: "600", color: main },
    labelSmall: { ...ff, fontSize: 11, lineHeight: 11 * 1.27, fontWeight: "600", color: sub },
  };
}
