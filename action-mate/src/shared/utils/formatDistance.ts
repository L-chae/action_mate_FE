// src/shared/utils/formatDistance.ts
// meters(number) -> "320m" | "0.6km" | "12.3km"
// - 외부 라이브러리 없이 간단/일관 포맷
// - 기본: 1000m 미만은 m, 1000m 이상은 km(소수 1자리)
// - 10km 이상은 km(소수 1자리 유지 or 정수로 바꾸고 싶으면 옵션으로)

type FormatDistanceOptions = {
  /**
   * km로 표시할 때 소수 자릿수
   * 기본 1자리: 0.6km, 12.3km
   */
  kmDecimals?: number;

  /**
   * 10km 이상일 때 정수 km로 반올림 표시할지
   * true면: 12km, 128km
   */
  largeKmAsInt?: boolean;

  /**
   * "m" 표시 기준(기본 1000)
   * 예: 1500부터 km로 보이게 하고 싶으면 1500
   */
  kmThresholdMeters?: number;
};

const DEFAULTS: Required<FormatDistanceOptions> = {
  kmDecimals: 1,
  largeKmAsInt: false,
  kmThresholdMeters: 1000,
};

function clampNonNegative(n: number) {
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function roundTo(n: number, decimals: number) {
  const d = Math.pow(10, decimals);
  return Math.round(n * d) / d;
}

/**
 * meters -> "320m" | "0.6km"
 */
export function formatDistance(
  meters: number | null | undefined,
  options: FormatDistanceOptions = {}
): string {
  if (meters == null) return "";

  const m = clampNonNegative(meters);
  const { kmDecimals, largeKmAsInt, kmThresholdMeters } = {
    ...DEFAULTS,
    ...options,
  };

  // 0~999m => m
  if (m < kmThresholdMeters) {
    // m는 정수로 표시
    return `${Math.round(m)}m`;
  }

  const km = m / 1000;

  // 10km 이상 정수 표시 옵션
  if (largeKmAsInt && km >= 10) {
    return `${Math.round(km)}km`;
  }

  const rounded = roundTo(km, kmDecimals);

  // 1.0km 같이 끝이 .0이면 소수 제거 (보기 좋게)
  if (Number.isInteger(rounded)) return `${rounded}km`;

  return `${rounded}km`;
}
