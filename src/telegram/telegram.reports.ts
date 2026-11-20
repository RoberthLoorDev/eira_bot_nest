import { CategoryTypeValue } from '../categories/categories.types';
import {
  formatLocalDateLabel,
  formatUtcTimeForUser,
  getLocalDateString,
  LocalDateRange,
} from '../common/datetime.util';
import {
  CompareRecordsSummary,
  QueryRecordsSummary,
  RecordWithCategory,
} from '../records/records.types';

const TYPE_PLURAL_LABELS: Record<CategoryTypeValue, string> = {
  gasto: 'Gastos',
  ingreso: 'Ingresos',
  ahorro: 'Ahorros',
};

function formatRangeLabel(range: LocalDateRange): string {
  if (range.startDate === range.endDate) {
    return formatLocalDateLabel(range.startDate);
  }
  return `${formatLocalDateLabel(range.startDate)} al ${formatLocalDateLabel(range.endDate)}`;
}

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function formatScopeLabel(
  type?: CategoryTypeValue,
  categoryName?: string,
): string {
  const base = type ? TYPE_PLURAL_LABELS[type] : 'Movimientos';
  return categoryName ? `${base} en "${categoryName}"` : base;
}

function groupRecentByLocalDate(
  records: RecordWithCategory[],
  timezone: string,
): Map<string, RecordWithCategory[]> {
  const grouped = new Map<string, RecordWithCategory[]>();
  for (const rec of records) {
    const dayKey = getLocalDateString(rec.occurredAt, timezone);
    const list = grouped.get(dayKey);
    if (list) {
      list.push(rec);
    } else {
      grouped.set(dayKey, [rec]);
    }
  }
  return grouped;
}

export interface QueryReportInput {
  summary: QueryRecordsSummary;
  range: LocalDateRange;
  timezone: string;
  type?: CategoryTypeValue;
  categoryName?: string;
}

export function formatQueryReport(input: QueryReportInput): string {
  const scope = formatScopeLabel(input.type, input.categoryName);
  const periodLabel = formatRangeLabel(input.range);

  if (input.summary.totalCount === 0) {
    return `📊 ${scope} (${periodLabel})\n\nNo encontré movimientos registrados en ese período.`;
  }

  const lines: string[] = [
    `📊 ${scope} (${periodLabel})`,
    `💵 Total: ${formatMoney(input.summary.total)} (${input.summary.totalCount} mov.)`,
  ];

  if (input.summary.byCategory.length > 0) {
    lines.push('', '🏷️ Por categoría:');
    for (const cat of input.summary.byCategory) {
      const icon = cat.categoryEmoji ? `${cat.categoryEmoji} ` : '• ';
      lines.push(
        `${icon}${cat.categoryName}: ${formatMoney(cat.total)} (${cat.count})`,
      );
    }
  }

  const grouped = groupRecentByLocalDate(
    input.summary.recentRecords,
    input.timezone,
  );

  lines.push('', '🧾 Últimos movimientos:');
  for (const [dayKey, dayRecords] of grouped.entries()) {
    lines.push(`📅 ${formatLocalDateLabel(dayKey)}`);
    for (const rec of dayRecords) {
      const time = formatUtcTimeForUser(rec.occurredAt, input.timezone);
      lines.push(
        `  • ${time} · ${formatMoney(rec.amount)} · ${rec.description} (${rec.categoryName})`,
      );
    }
  }

  if (input.summary.totalCount > input.summary.recentRecords.length) {
    lines.push(
      '',
      `(Mostrando los últimos ${input.summary.recentRecords.length} de ${input.summary.totalCount} movimientos)`,
    );
  }

  return lines.join('\n');
}

export interface ComparisonReportInput {
  comparison: CompareRecordsSummary;
  previousRange: LocalDateRange;
  currentRange: LocalDateRange;
  type?: CategoryTypeValue;
  categoryName?: string;
}

export function formatComparisonReport(input: ComparisonReportInput): string {
  const scope = formatScopeLabel(input.type, input.categoryName);
  const prevLabel = formatRangeLabel(input.previousRange);
  const currLabel = formatRangeLabel(input.currentRange);
  const { previous, current, diffAmount, diffPercent, topCategoryChanges } =
    input.comparison;

  const sign = diffAmount > 0 ? '+' : diffAmount < 0 ? '-' : '';
  const absDiff = Math.abs(diffAmount);
  const trendIcon = diffAmount > 0 ? '📈' : diffAmount < 0 ? '📉' : '➖';
  const percentText =
    diffPercent !== null
      ? ` (${diffPercent > 0 ? '+' : ''}${diffPercent.toFixed(1)}%)`
      : previous.total === 0 && current.total > 0
        ? ' (sin base anterior)'
        : '';

  const lines: string[] = [
    `⚖️ Comparación · ${scope}`,
    '',
    `• Período anterior (${prevLabel}): ${formatMoney(previous.total)} (${previous.totalCount} mov.)`,
    `• Período actual (${currLabel}): ${formatMoney(current.total)} (${current.totalCount} mov.)`,
    `${trendIcon} Diferencia: ${sign}${formatMoney(absDiff)}${percentText}`,
  ];

  if (topCategoryChanges.length > 0 && !input.categoryName) {
    lines.push('', '🏷️ Principales cambios por categoría:');
    for (const item of topCategoryChanges) {
      const icon = item.categoryEmoji ? `${item.categoryEmoji} ` : '• ';
      const catSign =
        item.diffAmount > 0 ? '+' : item.diffAmount < 0 ? '-' : '';
      lines.push(
        `${icon}${item.categoryName}: ${formatMoney(item.previousTotal)} → ${formatMoney(item.currentTotal)} (${catSign}${formatMoney(Math.abs(item.diffAmount))})`,
      );
    }
  }

  return lines.join('\n');
}
