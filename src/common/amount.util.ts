export function parsePositiveAmount(rawText: string): number | null {
  const normalized = rawText.trim().toLowerCase().replace(',', '.');

  const centsMatch = normalized.match(
    /^(\d{1,2})\s*(?:centavos?|ctvs?|cents?|c)$/,
  );
  if (centsMatch) {
    const cents = Number(centsMatch[1]);
    return cents > 0 ? Math.round(cents) / 100 : null;
  }

  const cleaned = normalized.replace(/[$\s]/g, '');
  const withLeadingZero = cleaned.startsWith('.') ? `0${cleaned}` : cleaned;

  if (!/^\d+(\.\d{1,2})?$/.test(withLeadingZero)) {
    return null;
  }

  const parsed = Number(withLeadingZero);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
