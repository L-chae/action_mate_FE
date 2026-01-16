// src/shared/theme/colors.ts

/**
 * ✅ Raw palette + Semantic tokens + Theme builder
 * - Raw: 브랜드/기능/뉴트럴의 “원색(원천)” 값
 * - Semantic: 화면에서 반복되는 의미 기반 컬러(overlay, divider, icon, ratingStar 등)
 * - buildThemeColors: light/dark 모드에 맞는 실제 사용 컬러 객체 생성
 */

export const colors = {
  // Brand (Raw)
  primary: "#FF5722",
  point: "#FFC84D",
  primaryLight: "#FFF2EC",
  primaryDark: "#D84315",

  // Light (Raw)
  backgroundLight: "#FFFFFF",
  surfaceLight: "#FFFFFF",
  textMainLight: "#171717",
  textSubLight: "#616161",
  borderLight: "#EEEEEE",

  // Dark (Raw)
  backgroundDark: "#121212",
  surfaceDark: "#1E1E1E",
  textMainDark: "#EEEEEE",
  textSubDark: "#9E9E9E",
  borderDark: "#2C2C2C",

  // Functional (Raw)
  success: "#4CAF50",
  error: "#D32F2F",
  warning: "#FFB300",
  info: "#2196F3",

  // Neutral scale (Raw)
  neutral: {
    50: "#FAFAFA",
    100: "#F5F5F5",
    200: "#EEEEEE",
    300: "#E0E0E0",
    400: "#BDBDBD",
    500: "#9E9E9E",
    600: "#757575",
    700: "#616161",
    800: "#424242",
    900: "#212121",
  },
} as const;

export type AppColors = typeof colors;

/** hex(#RRGGBB or #RGB) + alpha(0~1) -> rgba() */
export const withAlpha = (hex: string, alpha: number) => {
  const a = Math.max(0, Math.min(1, alpha));
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;

  if (full.length !== 6) return `rgba(0,0,0,${a})`;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
};

export type ColorMode = "light" | "dark";

/**
 * ✅ 실제 화면에서 쓰기 좋은 "테마 컬러"
 * - useAppTheme()에서 t.colors로 내려주는 형태를 이걸로 맞추면
 *   화면은 semantic token만 쓰면 됩니다.
 */
export type ThemeColors = {
  // core
  background: string;
  surface: string;
  textMain: string;
  textSub: string;
  border: string;

  // brand/functional
  primary: string;
  point: string;
  success: string;
  error: string;
  warning: string;
  info: string;

  // semantic (공용 의미 토큰)
  ratingStar: string;

  overlay: {
    /** 기존에 많이 쓰던 rgba(0,0,0,0.06) 같은 것 대체 */
    6: string;
    8: string;
    12: string;
    14: string;
    16: string;
    45: string;
    55: string;
    75: string;
  };

  divider: string;

  icon: {
    /** 설정 아이콘 등 기본 아이콘 컬러 */
    default: string;
    /** 더 옅은 아이콘 */
    muted: string;
  };

  shadow: {
    color: string;
    opacityLow: string; // rgba string
    opacityMid: string; // rgba string
  };

  neutral: AppColors["neutral"];
};

/** ✅ 라이트/다크에 맞는 실제 색상 객체를 만들어줌 */
export const buildThemeColors = (mode: ColorMode): ThemeColors => {
  const isDark = mode === "dark";

  const background = isDark ? colors.backgroundDark : colors.backgroundLight;
  const surface = isDark ? colors.surfaceDark : colors.surfaceLight;
  const textMain = isDark ? colors.textMainDark : colors.textMainLight;
  const textSub = isDark ? colors.textSubDark : colors.textSubLight;
  const border = isDark ? colors.borderDark : colors.borderLight;

  // “텍스트 메인”을 기준으로 overlay를 만들면 다크모드에서도 자연스럽습니다.
  const overlay = {
    6: withAlpha(textMain, 0.06),
    8: withAlpha(textMain, 0.08),
    12: withAlpha(textMain, 0.12),
    14: withAlpha(textMain, 0.14),
    16: withAlpha(textMain, 0.16),
    45: withAlpha(textMain, 0.45),
    55: withAlpha(textMain, 0.55),
    75: withAlpha(textMain, 0.75),
  } as const;

  return {
    background,
    surface,
    textMain,
    textSub,
    border,

    primary: colors.primary,
    point: colors.point,
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    info: colors.info,

    // 별점(★) 색: 기존 #FFC107 대체
    ratingStar: colors.point,

    overlay,
    divider: overlay[6],

    icon: {
      default: overlay[75],
      muted: overlay[55],
    },

    shadow: {
      color: "#000000",
      opacityLow: withAlpha("#000000", 0.08),
      opacityMid: withAlpha("#000000", 0.12),
    },

    neutral: colors.neutral,
  };
};