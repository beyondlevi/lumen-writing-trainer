// Days are local dates ("YYYY-MM-DD"): a streak follows the wearer's calendar.

/** The local date of `time` as "YYYY-MM-DD". */
export function dayKey(time: Date | number = Date.now()): string {
  const date = typeof time === 'number' ? new Date(time) : time;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The day `offset` days from `key` (negative goes back). */
export function addDays(key: string, offset: number): string {
  const [year, month, day] = key.split('-').map(Number);
  return dayKey(new Date(year, month - 1, day + offset, 12));
}

/** Noon of the day `key`, local time (for formatting the weekday). */
export function dayDate(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}
