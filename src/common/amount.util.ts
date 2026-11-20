export function parsePositiveAmount(rawText: string): number | null {
  const normalized = rawText
    .trim()
    .toLowerCase()
    .replace(/[.!?]+$/g, '')
    .trim();

  const centsMatch = normalized.match(
    /^(?:fueron|son|cost[oó]|me cost[oó]|de)?\s*(\d{1,2})\s*(?:centavos?|ctvs?|cents?|c)$/,
  );
  if (centsMatch) {
    const cents = Number(centsMatch[1]);
    return cents > 0 ? Math.round(cents) / 100 : null;
  }

  const dollarsAndCentsMatch = normalized.match(
    /^(?:fueron|son|cost[oó]|me cost[oó]|de)?\s*\$?\s*(\d+)\s*(?:d[oó]lar(?:es)?|usd)?\s*(?:con|y)\s*(\d{1,2})\s*(?:centavos?|ctvs?|cents?)?$/,
  );
  if (dollarsAndCentsMatch) {
    const dollars = Number(dollarsAndCentsMatch[1]);
    const cents = Number(dollarsAndCentsMatch[2]);
    const total = dollars + cents / 100;
    return Number.isFinite(total) && total > 0
      ? Math.round(total * 100) / 100
      : null;
  }

  const phraseNumberMatch = normalized.match(
    /^(?:fueron|son|cost[oó]|me cost[oó]|vale|es|de)?\s*\$?\s*(\d*(?:[.,]\d{1,2})?|\d+)\s*(?:d[oó]lar(?:es)?|usd|pesos?)?$/,
  );
  if (!phraseNumberMatch || !phraseNumberMatch[1]) {
    return null;
  }

  const cleaned = phraseNumberMatch[1].replace(',', '.');
  const withLeadingZero = cleaned.startsWith('.') ? `0${cleaned}` : cleaned;

  if (!/^\d+(\.\d{1,2})?$/.test(withLeadingZero)) {
    return null;
  }

  const parsed = Number(withLeadingZero);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
