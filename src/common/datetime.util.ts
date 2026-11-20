import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

const DEFAULT_TIMEZONE = 'America/Guayaquil';

const SPANISH_WEEKDAYS: readonly string[] = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

export interface LocalDateRange {
  startDate: string;
  endDate: string;
}

export interface LocalDateRangeUtc extends LocalDateRange {
  startUtc: Date;
  endExclusiveUtc: Date;
}

function resolveTimezone(timezone: string): string {
  const trimmed = timezone.trim();
  if (!trimmed) {
    return DEFAULT_TIMEZONE;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: trimmed });
    return trimmed;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function addCalendarDays(dateStr: string, days: number): string {
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const utc = new Date(
    Date.UTC(Number(yearStr), Number(monthStr) - 1, Number(dayStr) + days),
  );
  const y = utc.getUTCFullYear();
  const m = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utc.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isIsoDateString(value: string | null | undefined): boolean {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
}

export function getLocalDateString(utcDate: Date, timezone: string): string {
  const safeTz = resolveTimezone(timezone);
  return formatInTimeZone(utcDate, safeTz, 'yyyy-MM-dd');
}

export function getLocalWeekdayName(utcDate: Date, timezone: string): string {
  const safeTz = resolveTimezone(timezone);
  const isoDay = Number(formatInTimeZone(utcDate, safeTz, 'i'));
  const index = isoDay === 7 ? 0 : isoDay;
  return SPANISH_WEEKDAYS[index] ?? 'lunes';
}

export function getRecentWeekdaysReference(
  utcDate: Date,
  timezone: string,
): string {
  const safeTz = resolveTimezone(timezone);
  const todayStr = formatInTimeZone(utcDate, safeTz, 'yyyy-MM-dd');
  const isoDay = Number(formatInTimeZone(utcDate, safeTz, 'i'));
  const todayIndex = isoDay === 7 ? 0 : isoDay;

  const entries: string[] = [];
  for (let offset = 1; offset <= 7; offset += 1) {
    const dayStr = addCalendarDays(todayStr, -offset);
    const weekdayIdx = (todayIndex - offset + 7) % 7;
    entries.push(`${SPANISH_WEEKDAYS[weekdayIdx]}=${dayStr}`);
  }
  return entries.join(', ');
}

export function formatUtcForUser(utcDate: Date, timezone: string): string {
  const safeTz = resolveTimezone(timezone);
  return formatInTimeZone(utcDate, safeTz, 'dd/MM/yyyy HH:mm');
}

export function formatUtcTimeForUser(utcDate: Date, timezone: string): string {
  const safeTz = resolveTimezone(timezone);
  return formatInTimeZone(utcDate, safeTz, 'HH:mm');
}

export function formatLocalDateLabel(dateStr: string): string {
  if (!isIsoDateString(dateStr)) {
    return dateStr;
  }
  const [y, m, d] = dateStr.trim().split('-');
  return `${d}/${m}/${y}`;
}

export function getCurrentMonthLocalRange(
  nowUtc: Date,
  timezone: string,
): LocalDateRange {
  const today = getLocalDateString(nowUtc, timezone);
  const [year, month] = today.split('-');
  return {
    startDate: `${year}-${month}-01`,
    endDate: today,
  };
}

export function getPreviousMonthLocalRange(
  nowUtc: Date,
  timezone: string,
): LocalDateRange {
  const today = getLocalDateString(nowUtc, timezone);
  const [yearStr, monthStr] = today.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);

  const prevMonthFirst = new Date(Date.UTC(year, month - 2, 1));
  const prevMonthLast = new Date(Date.UTC(year, month - 1, 0));

  const formatUtcDate = (d: Date): string => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return {
    startDate: formatUtcDate(prevMonthFirst),
    endDate: formatUtcDate(prevMonthLast),
  };
}

// Converts local inclusive dates [startDate, endDate] to a half-open UTC range
// [startUtc, nextDayStartUtc) so PostgreSQL filters exact user-local days.
export function getLocalDateRangeUtc(
  startDateInput: string,
  endDateInput: string,
  timezone: string,
): LocalDateRangeUtc {
  const safeTz = resolveTimezone(timezone);
  const orderedStart =
    startDateInput <= endDateInput ? startDateInput : endDateInput;
  const orderedEnd =
    startDateInput <= endDateInput ? endDateInput : startDateInput;

  const nextDayAfterEnd = addCalendarDays(orderedEnd, 1);

  return {
    startDate: orderedStart,
    endDate: orderedEnd,
    startUtc: fromZonedTime(`${orderedStart}T00:00:00`, safeTz),
    endExclusiveUtc: fromZonedTime(`${nextDayAfterEnd}T00:00:00`, safeTz),
  };
}

// Interprets YYYY-MM-DD in the user's timezone using the current local clock time
// so backdated entries land on the intended local day in UTC.
export function parseLocalDateToUtc(
  localDateStr: string | null,
  timezone: string,
  nowUtc: Date = new Date(),
): Date {
  if (!localDateStr) {
    return nowUtc;
  }

  const trimmed = localDateStr.trim();
  if (!isIsoDateString(trimmed)) {
    return nowUtc;
  }

  const safeTz = resolveTimezone(timezone);
  const localTime = formatInTimeZone(nowUtc, safeTz, 'HH:mm:ss');
  const parsed = fromZonedTime(`${trimmed}T${localTime}`, safeTz);

  if (Number.isNaN(parsed.getTime())) {
    return nowUtc;
  }

  return parsed;
}
