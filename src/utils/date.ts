/** 将日期格式化为本地时区的 YYYY-MM-DD。 */
function dateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 本地时区的今天日期（YYYY-MM-DD）。 */
export function todayStr(): string {
  return dateStr(new Date());
}

/** 本地时区偏移 n 天后的日期（YYYY-MM-DD）。 */
export function addDays(offset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return dateStr(date);
}

/** 到期日展示文案：今天 / 明天 / N月N日。 */
export function formatDueDate(date: string): string {
  const today = todayStr();
  const tomorrow = addDays(1);
  if (date === today) return '今天';
  if (date === tomorrow) return '明天';
  const [, month, day] = date.split('-');
  return `${Number(month)}月${Number(day)}日`;
}
