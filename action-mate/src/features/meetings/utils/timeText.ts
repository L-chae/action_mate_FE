export function meetingTimeTextFromIso(iso: string) {
  const d = new Date(iso);
  const now = new Date();

  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diffDays =
    (startOfDay(d).getTime() - startOfDay(now).getTime()) / (24 * 60 * 60 * 1000);

  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");

  if (diffDays === 0) return `오늘 ${hh}:${mm}`;
  if (diffDays === 1) return `내일 ${hh}:${mm}`;

  // 그 외: 1/19(월) 19:00 형태
  const date = d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
  const weekday = d.toLocaleDateString("ko-KR", { weekday: "short" });
  return `${date}(${weekday}) ${hh}:${mm}`;
}