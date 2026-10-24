import { formatInTimeZone } from 'date-fns-tz';

export const TZ = 'Asia/Kolkata';

export function todayIST(now: Date = new Date()): string {
  return formatInTimeZone(now, TZ, 'yyyy-MM-dd');
}

export function istDate(ts: string | Date): string {
  return formatInTimeZone(new Date(ts), TZ, 'yyyy-MM-dd');
}

function toUTC(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(iso: string, n: number): string {
  return new Date(toUTC(iso) + n * 86_400_000).toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  return Math.round((toUTC(a) - toUTC(b)) / 86_400_000);
}

/** 0 = Sunday ... 6 = Saturday */
export function weekday(iso: string): number {
  return new Date(toUTC(iso)).getUTCDay();
}

export function skipSunday(iso: string): string {
  return weekday(iso) === 0 ? addDays(iso, 1) : iso;
}

export function firstMondayOf(year: number, month1: number): string {
  const first = `${year}-${String(month1).padStart(2, '0')}-01`;
  const offset = (8 - weekday(first)) % 7;
  return addDays(first, offset);
}

/** "Tue 27 Oct" for a YYYY-MM-DD date */
export function dayLabel(iso: string): string {
  return formatInTimeZone(new Date(`${iso}T00:00:00Z`), 'UTC', 'EEE d MMM');
}
