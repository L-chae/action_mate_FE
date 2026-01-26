// src/shared/utils/timeText.ts

/**
 * meetingTimeTextFromIso
 * - 서버가 "2026-01-13T14:30:00" (timezone 없음) 또는
 *   "2026-01-13T14:30:00Z" / "+09:00" 처럼 다양한 ISO를 줄 수 있으니
 *   파싱 실패/Invalid Date를 방어합니다.
 * - diffDays는 부동소수점 오차/타임존 영향이 있을 수 있어 "정수(day diff)"로 계산합니다.
 * - locale 출력은 환경별(안드/ios) 포맷 차이가 있어, 월/일은 직접 구성합니다.
 */
export function meetingTimeTextFromIso(iso: string) {
  const d = safeParseIso(iso);
  if (!d) return ""; // 파싱 불가 시 빈 값(화면에서 fallback 텍스트 사용 권장)

  const now = new Date();

  const dayDiff = diffDaysLocal(d, now);

  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");

  if (dayDiff === 0) return `오늘 ${hh}:${mm}`;
  if (dayDiff === 1) return `내일 ${hh}:${mm}`;
  if (dayDiff === -1) return `어제 ${hh}:${mm}`;

  // 그 외: 1/19(월) 19:00 형태
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = d.toLocaleDateString("ko-KR", { weekday: "short" }); // "월", "화" 등
  return `${month}/${day}(${weekday}) ${hh}:${mm}`;
}

/**
 * ✅ ISO 파싱 방어
 * - "YYYY-MM-DDTHH:mm:ss" (timezone 없음)도 Date가 파싱하긴 하지만
 *   환경별 파싱 차이가 있을 수 있으니 안전하게 처리합니다.
 */
function safeParseIso(iso: string): Date | null {
  const s = String(iso ?? "").trim();
  if (!s) return null;

  const d1 = new Date(s);
  if (!Number.isNaN(d1.getTime())) return d1;

  // "YYYY-MM-DD HH:mm:ss" 같은 비표준이 들어오는 경우를 대비
  // 공백을 T로 치환해 1회 더 시도
  const normalized = s.replace(" ", "T");
  const d2 = new Date(normalized);
  if (!Number.isNaN(d2.getTime())) return d2;

  return null;
}

/**
 * ✅ 로컬 날짜 기준 day diff 계산
 * - "자정" 기준으로 잘라 정수 차이를 구해 오차를 제거합니다.
 */
function diffDaysLocal(a: Date, b: Date): number {
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const ms = startOfDay(a).getTime() - startOfDay(b).getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * 현재 시간을 ISO 포맷 문자열로 반환
 * 예: "2026-01-24T10:00:00.000Z"
 */
export const nowIso = (): string => {
  return new Date().toISOString();
};