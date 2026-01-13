// src/shared/theme/colors.ts
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

  // NEW: Neutral scale (optional but useful)
  // (컴포넌트 만들다 보면 gray 계열이 꼭 필요해져서 미리 준비)
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
