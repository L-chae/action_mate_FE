// src/shared/theme/colors.ts

/**
 * ✅ Raw palette + Semantic tokens + Theme builder
 *
 * 목표
 * - colors: "원본 색상 팔레트" (디자인 기준값)
 * - ThemeColors: UI 컴포넌트가 직접 사용하는 "의미 기반(semantic) 토큰"
 * - buildThemeColors: light/dark 모드에 따라 semantic 토큰을 조립
 *
 * 운영 원칙 (이미 사용 중인 코드 영향 최소화)
 * - 기존 export 이름/구조 유지 (colors / withAlpha / buildThemeColors)
 * - ThemeColors의 키 이름/타입 변경 없음
 * - 색상 값/로직 변경 없음 (주석 정리만)
 */

export const colors = {
  /**
   * Brand (Raw)
   * - 앱의 대표 컬러. 버튼/링크/강조 액션에 사용
   * - primaryLight/primaryDark는 필요 시 확장용으로 남겨둠
   */
  primary: "#FF5722",
  primaryLight: "#FFF2EC",
  primaryDark: "#D84315",

  /**
   * Secondary (Raw)
   * - primary(오렌지)와 대비되는 보조 액션 컬러
   * - "덜 중요한 버튼", 보조 강조 등에 사용
   */
  secondary: "#455A64",

  /**
   * Accent (Raw)
   * - 작은 포인트(별점/배지/강조 요소)에 사용
   */
  point: "#FFC84D",

  /**
   * Light Mode Base (Raw)
   * - light 모드에서의 화면/텍스트/경계선 기본값
   */
  backgroundLight: "#FFFFFF",
  surfaceLight: "#FFFFFF",
  textMainLight: "#171717",
  textSubLight: "#616161",
  borderLight: "#EEEEEE",

  /**
   * Dark Mode Base (Raw)
   * - dark 모드에서의 화면/텍스트/경계선 기본값
   */
  backgroundDark: "#121212",
  surfaceDark: "#1E1E1E",
  textMainDark: "#EEEEEE",
  textSubDark: "#9E9E9E",
  borderDark: "#2C2C2C",

  /**
   * Functional (Raw)
   * - 상태/피드백 메시지 (성공/에러/경고/정보)
   * - *Bg는 라이트 모드용 "연한 배경색" (알림창/뱃지 배경)
   * - 다크 모드는 buildThemeColors에서 투명도를 이용해 너무 튀지 않게 처리
   */
  success: "#4CAF50",
  successBg: "#E8F5E9",

  error: "#D32F2F",
  errorBg: "#FFEBEE",

  warning: "#FFB300",
  warningBg: "#FFF8E1",

  info: "#2196F3",
  infoBg: "#E3F2FD",

  /**
   * Neutral scale (Raw)
   * - 회색 스케일. 배경/구분선/비활성/칩 배경 등 폭넓게 사용
   * - 숫자가 클수록 더 진한 색
   */
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

/**
 * hex(#RRGGBB or #RGB) + alpha(0~1) -> rgba()
 *
 * 왜 필요한가?
 * - 다크모드에서 "연한 배경색(Bg)"을 그대로 쓰면 너무 밝고 떠 보일 수 있음
 * - 같은 색상도 alpha로 처리하면 모드/배경에 자연스럽게 섞임
 *
 * 동작
 * - 잘못된 hex가 들어오면 안전하게 검정 기반 rgba로 폴백 (UI 깨짐 방지)
 */
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
 * ✅ ThemeColors (Semantic Tokens)
 *
 * 핵심 아이디어
 * - 컴포넌트는 colors(원본)를 직접 쓰지 않고, 아래 semantic 이름만 사용
 * - "이 색이 왜 존재하는지"가 이름에서 드러나게 하는 목적
 */
export type ThemeColors = {
  // 화면 기본
  background: string; // 앱 전체 배경
  surface: string; // 카드/모달 등 떠 있는 영역
  textMain: string; // 기본 본문 텍스트
  textSub: string; // 보조/설명 텍스트
  border: string; // 기본 경계선

  // 브랜드/액션
  primary: string; // 대표 액션 컬러
  secondary: string; // 보조 액션 컬러
  point: string; // 작은 포인트 강조(배지/별점 등)

  // 상태(텍스트/아이콘)
  success: string;
  error: string;
  warning: string;
  info: string;

  // 상태(배경 전용) - 알림/배너/뱃지 배경
  successBg: string;
  errorBg: string;
  warningBg: string;
  infoBg: string;

  // 의미 기반 UI 토큰
  ratingStar: string; // 별점
  chipBg: string; // 태그/칩 배경
  scrim: string; // 모달 뒤 어두운 배경

  /**
   * overlay
   * - 텍스트/아이콘/구분선 등에서 "투명도 단계"를 일관되게 쓰기 위한 세트
   * - 숫자는 alpha(투명도) 강도를 의미 (6% ~ 75%)
   */
  overlay: {
    6: string;
    8: string;
    12: string;
    14: string;
    16: string;
    45: string;
    55: string;
    75: string;
  };

  divider: string; // 얇은 구분선 (리스트/섹션 구분)

  icon: {
    default: string; // 기본 아이콘
    muted: string; // 덜 중요한 아이콘
  };

  shadow: {
    color: string;
    opacityLow: string; // 약한 그림자(= rgba 문자열)
    opacityMid: string; // 중간 그림자(= rgba 문자열)
  };

  neutral: AppColors["neutral"]; // 필요 시 회색 스케일 직접 접근
};

/**
 * ✅ Theme Builder
 *
 * 원칙
 * - light/dark에서 "기본 배경/텍스트/경계선"을 먼저 결정
 * - 그 다음 overlay(투명도 단계)를 만들어 재사용
 * - 상태 배경색(Bg)은 다크모드에서 alpha로 눌러서 부담 줄이기
 */
export const buildThemeColors = (mode: ColorMode): ThemeColors => {
  const isDark = mode === "dark";

  // 1) 모드별 기본값 선택
  const background = isDark ? colors.backgroundDark : colors.backgroundLight;
  const surface = isDark ? colors.surfaceDark : colors.surfaceLight;
  const textMain = isDark ? colors.textMainDark : colors.textMainLight;
  const textSub = isDark ? colors.textSubDark : colors.textSubLight;
  const border = isDark ? colors.borderDark : colors.borderLight;

  /**
   * 2) overlay (투명도 단계)
   * - 기존 구현 유지: textMain을 기준으로 alpha를 얹어 일관된 톤을 만든다
   * - icon/divider 등 다양한 곳에서 같은 단계값을 재사용
   */
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
    // 화면 기본
    background,
    surface,
    textMain,
    textSub,
    border,

    // 브랜드/액션
    primary: colors.primary,
    secondary: colors.secondary,
    point: colors.point,

    // 상태(텍스트/아이콘)
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    info: colors.info,

    /**
     * 상태 배경(Bg)
     * - light: 미리 정의된 연한 배경색 사용
     * - dark: 같은 색을 낮은 alpha로 섞어 "너무 밝게 뜨는 현상"을 방지
     */
    successBg: isDark ? withAlpha(colors.success, 0.15) : colors.successBg,
    errorBg: isDark ? withAlpha(colors.error, 0.15) : colors.errorBg,
    warningBg: isDark ? withAlpha(colors.warning, 0.15) : colors.warningBg,
    infoBg: isDark ? withAlpha(colors.info, 0.15) : colors.infoBg,

    // 의미 기반 UI 토큰
    ratingStar: colors.point,
    chipBg: isDark ? colors.neutral[800] : colors.neutral[100],
    scrim: withAlpha("#000000", 0.6),

    // 공통 레이어/구분선/아이콘 톤
    overlay,
    divider: overlay[6],

    icon: {
      default: overlay[75],
      muted: overlay[55],
    },

    /**
     * 그림자
     * - light: 낮은 alpha로 은은하게
     * - dark: 배경이 어두워 그림자가 잘 안 보이므로 조금 더 진하게
     */
    shadow: {
      color: "#000000",
      opacityLow: withAlpha("#000000", isDark ? 0.3 : 0.08),
      opacityMid: withAlpha("#000000", isDark ? 0.5 : 0.12),
    },

    neutral: colors.neutral,
  };
};