// src/shared/theme/spacing.ts

/**
 * ✅ Spacing / Radius / Motion tokens
 *
 * 목적
 * - 숫자 하드코딩을 줄이고 UI 간격/모서리/애니메이션을 일관되게 맞추기
 * - 초반 앱에서 가장 자주 바뀌는 값(패딩/라운드)을 한 곳에서 관리
 *
 * 호환성 원칙
 * - 기존 export/키/값 그대로 유지 (이미 사용 중인 스타일 영향 없음)
 */
export const spacing = {
  /**
   * Radius
   * - 카드/버튼/칩 등 "모서리 둥글기" 기준
   * - 초보 앱에서는 radius만 통일해도 UI가 확 안정적으로 보임
   */
  radiusXs: 6,
  radiusSm: 8,
  radiusMd: 12,
  radiusLg: 16,
  radiusXl: 20,

  /**
   * Border
   * - 경계선 두께 기본값 (플랫폼/해상도에 따라 1이 가장 무난)
   */
  borderWidth: 1,

  /**
   * Layout
   * - 화면 전체 레이아웃의 기본 여백
   * - pagePadding은 스크린 컨테이너에서 공통으로 쓰기 좋음
   */
  pagePaddingH: 16,
  pagePaddingV: 12,

  /**
   * Spacing scale
   * - 가장 많이 쓰는 간격 스케일
   * - 사용 예: padding: theme.spacing.space[4] // 16
   *
   * 주의(의도)
   * - index 기반이라 "의미"를 유지하려면 팀에서 자주 쓰는 값만 넣는 게 좋음
   * - 값 자체는 이미 사용 중이면 함부로 변경하지 않는 게 안정적
   */
  space: [0, 4, 8, 12, 16, 20, 24, 28, 32, 40, 48] as const,

  /**
   * Motion (ms)
   * - 앱 전반 애니메이션 시간 통일
   * - 초보 앱에서는 fast/normal 정도만 있어도 충분
   */
  animFast: 150,
  animNormal: 220,
} as const;

export type AppSpacing = typeof spacing;