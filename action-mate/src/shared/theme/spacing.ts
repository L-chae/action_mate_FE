// src/shared/theme/spacing.ts
export const spacing = {
  // Radius
  radiusXs: 6,
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 20,

  // Border
  borderWidth: 1,

  // Layout
  pagePaddingH: 16,
  pagePaddingV: 12,

  // NEW: spacing scale (가장 많이 씀)
  // 예: padding: theme.spacing.space[4]  // 16
  space: [0, 4, 8, 12, 16, 20, 24, 28, 32, 40, 48] as const,

  // Motion (ms)
  animFast: 150,
  animNormal: 220,
} as const;

export type AppSpacing = typeof spacing;
