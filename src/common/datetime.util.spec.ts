import {
  formatUtcForUser,
  getLocalDateString,
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
