// src/shared/utils/formatTime.ts
// - 외부 라이브러리 없이 ISO 시간을 한국어 UI 문자열로 변환
// - 가능하면 Intl + timeZone("Asia/Seoul")을 사용하고, 지원이 없으면 로컬 타임존으로 fallback

type FormatTimeOptions = {
  now?: Date;
  timeZone?: string; // default: "Asia/Seoul"
};

const DEFAULT_TZ = "Asia/Seoul";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function safeDate(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function hasIntlTimeZoneSupport() {
  try {
    // 일부 RN 환경에서 Intl이 없거나 timeZone 옵션이 무시될 수 있어 방어
    // eslint-disable-next-line no-new
    new Intl.DateTimeFormat("ko-KR", { timeZone: DEFAULT_TZ }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/**
 * Intl(timeZone)로 특정 타임존 기준 year/month/day/hour/minute를 가져오기
 * (fallback: 로컬)
 */
function getPartsInTimeZone(date: Date, timeZone: string) {
  if (hasIntlTimeZoneSupport()) {
    const dtf = new Intl.DateTimeFormat("ko-KR", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const parts = dtf.formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value;

    const year = Number(get("year"));
    const month = Number(get("month"));
    const day = Number(get("day"));
    const hour = Number(get("hour"));
    const minute = Number(get("minute"));

    return { year, month, day, hour, minute };
  }

  // Fallback: device local timezone 기준
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
}

function isSameYMD(a: { year: number; month: number; day: number }, b: { year: number; month: number; day: number }) {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function ymdKey(p: { year: number; month: number; day: number }) {
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

/**
 * 두 날짜가 "타임존 기준"으로 몇 일 차이인지 계산
 * (정확히 자정 기준 비교하기 위해 YMD만 사용)
 */
function diffDaysByYMD(from: Date, to: Date, timeZone: string) {
  const a = getPartsInTimeZone(from, timeZone);
  const b = getPartsInTimeZone(to, timeZone);

  // YMD만으로 Date를 만들어(로컬) day difference 계산 (오프셋 영향 최소화)
  const aMid = new Date(a.year, a.month - 1, a.day).getTime();
  const bMid = new Date(b.year, b.month - 1, b.day).getTime();
  const diff = Math.round((bMid - aMid) / (24 * 60 * 60 * 1000));
  return diff;
}

/**
 * ISO -> "오늘 19:00", "내일 08:30", "1월 14일 19:00"
 * 모임 시간 표시용 (절대 + 상대(오늘/내일/어제) 혼합)
 */
export function formatMeetingTime(iso: string, options: FormatTimeOptions = {}) {
  const date = safeDate(iso);
  if (!date) return "";

  const timeZone = options.timeZone ?? DEFAULT_TZ;
  const now = options.now ?? new Date();

  const p = getPartsInTimeZone(date, timeZone);
  const n = getPartsInTimeZone(now, timeZone);

  const hhmm = `${pad2(p.hour)}:${pad2(p.minute)}`;

  if (isSameYMD(p, n)) return `오늘 ${hhmm}`;

  // 내일/어제 판정
  const dayDiff = diffDaysByYMD(now, date, timeZone); // now -> date
  if (dayDiff === 1) return `내일 ${hhmm}`;
  if (dayDiff === -1) return `어제 ${hhmm}`;

  // 같은 해면 "M월 D일 HH:MM", 아니면 "YYYY년 M월 D일 HH:MM"
  if (p.year === n.year) return `${p.month}월 ${p.day}일 ${hhmm}`;
  return `${p.year}년 ${p.month}월 ${p.day}일 ${hhmm}`;
}

/**
 * ISO -> "방금", "3분 전", "2시간 전", "어제", "3일 전", "2026.01.14"
 * DM/알림/업데이트 시간 표시용
 */
export function formatTimeAgo(iso: string, options: FormatTimeOptions = {}) {
  const date = safeDate(iso);
  if (!date) return "";

  const timeZone = options.timeZone ?? DEFAULT_TZ;
  const now = options.now ?? new Date();

  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) {
    // 미래 시간(서버/기기 시간 차이 등) 방어: 그냥 절대 날짜로
    return formatYMD(iso, options);
  }

  const diffMin = Math.floor(diffMs / (60 * 1000));
  if (diffMin < 1) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;

  // 24시간 넘어가면 YMD 기준으로 "어제/며칠 전"
  const dayDiff = diffDaysByYMD(date, now, timeZone); // date -> now
  if (dayDiff === 1) return "어제";
  if (dayDiff < 7) return `${dayDiff}일 전`;

  // 일주일 이상이면 절대 날짜로
  return formatYMD(iso, options);
}

/**
 * ISO -> "2026.01.14"
 */
export function formatYMD(iso: string, options: FormatTimeOptions = {}) {
  const date = safeDate(iso);
  if (!date) return "";

  const timeZone = options.timeZone ?? DEFAULT_TZ;
  const p = getPartsInTimeZone(date, timeZone);

  return `${p.year}.${pad2(p.month)}.${pad2(p.day)}`;
}

/**
 * ISO -> "19:05"
 */
export function formatHHmm(iso: string, options: FormatTimeOptions = {}) {
  const date = safeDate(iso);
  if (!date) return "";

  const timeZone = options.timeZone ?? DEFAULT_TZ;
  const p = getPartsInTimeZone(date, timeZone);

  return `${pad2(p.hour)}:${pad2(p.minute)}`;
}

/**
 * 디버깅/테스트에 도움되는 유틸: YMD key
 * ex) "2026-01-14"
 */
export function formatYMDKey(iso: string, options: FormatTimeOptions = {}) {
  const date = safeDate(iso);
  if (!date) return "";
  const timeZone = options.timeZone ?? DEFAULT_TZ;
  return ymdKey(getPartsInTimeZone(date, timeZone));
}
