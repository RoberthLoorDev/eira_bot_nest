import {
  formatLocalDateLabel,
  formatUtcForUser,
  getCurrentMonthLocalRange,
  getLocalDateRangeUtc,
  getLocalDateString,
  getLocalWeekdayName,
  getPreviousMonthLocalRange,
  parseLocalDateToUtc,
} from './datetime.util';

describe('datetime.util', () => {
  it('should format local date string in user timezone', () => {
    // 2026-11-19T02:30:00Z is 2026-11-18 21:30 in America/Guayaquil (UTC-5)
    const utcDate = new Date('2026-11-19T02:30:00.000Z');
    expect(getLocalDateString(utcDate, 'America/Guayaquil')).toBe('2026-11-18');
    expect(formatUtcForUser(utcDate, 'America/Guayaquil')).toBe(
      '18/11/2026 21:30',
    );
  });

  it('should return Spanish weekday name in user timezone', () => {
    // 2026-11-20 is Friday in America/Guayaquil
    const fridayUtc = new Date('2026-11-20T21:00:00.000Z');
    expect(getLocalWeekdayName(fridayUtc, 'America/Guayaquil')).toBe('viernes');

    // 2026-11-21T02:00:00Z is still Friday 21:00 in Ecuador, but Saturday 03:00 in Madrid
    const lateFridayUtc = new Date('2026-11-21T02:00:00.000Z');
    expect(getLocalWeekdayName(lateFridayUtc, 'America/Guayaquil')).toBe(
      'viernes',
    );
    expect(getLocalWeekdayName(lateFridayUtc, 'Europe/Madrid')).toBe('sábado');
  });

  it('should convert inclusive local dates into half-open UTC boundaries', () => {
    const range = getLocalDateRangeUtc(
      '2026-11-10',
      '2026-11-10',
      'America/Guayaquil',
    );

    expect(range.startUtc.toISOString()).toBe('2026-11-10T05:00:00.000Z');
    expect(range.endExclusiveUtc.toISOString()).toBe(
      '2026-11-11T05:00:00.000Z',
    );
  });

  it('should swap reversed start and end dates automatically', () => {
    const range = getLocalDateRangeUtc(
      '2026-11-20',
      '2026-11-10',
      'America/Guayaquil',
    );

    expect(range.startDate).toBe('2026-11-10');
    expect(range.endDate).toBe('2026-11-20');
  });

  it('should compute current and previous month local ranges', () => {
    const nowUtc = new Date('2026-11-20T21:00:00.000Z');
    expect(getCurrentMonthLocalRange(nowUtc, 'America/Guayaquil')).toEqual({
      startDate: '2026-11-01',
      endDate: '2026-11-20',
    });
    expect(getPreviousMonthLocalRange(nowUtc, 'America/Guayaquil')).toEqual({
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    });
  });

  it('should format YYYY-MM-DD as DD/MM/YYYY', () => {
    expect(formatLocalDateLabel('2026-11-10')).toBe('10/11/2026');
  });

  it('should convert local YYYY-MM-DD into UTC preserving local day', () => {
    const nowUtc = new Date('2026-11-19T02:30:00.000Z');
    const converted = parseLocalDateToUtc(
      '2026-11-17',
      'America/Guayaquil',
      nowUtc,
    );

    expect(getLocalDateString(converted, 'America/Guayaquil')).toBe(
      '2026-11-17',
    );
    expect(converted.toISOString()).toBe('2026-11-18T02:30:00.000Z');
  });

  it('should return nowUtc when date string is null or invalid', () => {
    const nowUtc = new Date('2026-11-19T02:30:00.000Z');
    expect(parseLocalDateToUtc(null, 'America/Guayaquil', nowUtc)).toBe(nowUtc);
    expect(
      parseLocalDateToUtc('invalid-date', 'America/Guayaquil', nowUtc),
    ).toBe(nowUtc);
  });

  it('should fall back to default timezone when timezone is invalid', () => {
    const utcDate = new Date('2026-11-19T02:30:00.000Z');
    expect(getLocalDateString(utcDate, 'Invalid/Zone')).toBe('2026-11-18');
  });
});
