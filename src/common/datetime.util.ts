import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

const DEFAULT_TIMEZONE = 'America/Guayaquil';

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

export function getLocalDateString(utcDate: Date, timezone: string): string {
  const safeTz = resolveTimezone(timezone);
  return formatInTimeZone(utcDate, safeTz, 'yyyy-MM-dd');
}

export function formatUtcForUser(utcDate: Date, timezone: string): string {
  const safeTz = resolveTimezone(timezone);
  return formatInTimeZone(utcDate, safeTz, 'dd/MM/yyyy HH:mm');
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
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
