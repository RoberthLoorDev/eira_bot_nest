import { Injectable } from '@nestjs/common';
import { RecordsRepository } from './records.repository';
import {
  CategoryDiffItem,
  CategoryTotalItem,
  CompareRecordsSummary,
  CreateRecordInput,
  CreateRecordResult,
  QueryRecordsRangeInput,
  QueryRecordsSummary,
  RecordWithCategory,
} from './records.types';

const MAX_DESCRIPTION_LENGTH = 500;
const DEFAULT_RECENT_LIMIT = 15;
const TOP_CATEGORY_CHANGES_LIMIT = 5;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

@Injectable()
export class RecordsService {
  constructor(private readonly recordsRepository: RecordsRepository) {}

  async createForUser(input: CreateRecordInput): Promise<CreateRecordResult> {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { ok: false, reason: 'invalid_amount' };
    }

    const trimmedDescription = input.description.trim();
    if (!trimmedDescription) {
      return { ok: false, reason: 'invalid_description' };
    }

    const safeDescription =
      trimmedDescription.length > MAX_DESCRIPTION_LENGTH
        ? trimmedDescription.slice(0, MAX_DESCRIPTION_LENGTH)
        : trimmedDescription;

    const record = await this.recordsRepository.createRecord({
      ...input,
      amount: roundMoney(input.amount),
      description: safeDescription,
    });

    return { ok: true, record };
  }

  async queryByRange(
    input: QueryRecordsRangeInput,
  ): Promise<QueryRecordsSummary> {
    const rows = await this.recordsRepository.findActiveByRange(input);
    const limit = input.recentLimit ?? DEFAULT_RECENT_LIMIT;
    return this.summarizeRecords(rows, limit);
  }

  async compareRanges(
    previousInput: QueryRecordsRangeInput,
    currentInput: QueryRecordsRangeInput,
  ): Promise<CompareRecordsSummary> {
    const [previousRows, currentRows] = await Promise.all([
      this.recordsRepository.findActiveByRange(previousInput),
      this.recordsRepository.findActiveByRange(currentInput),
    ]);

    const previous = this.summarizeRecords(previousRows, DEFAULT_RECENT_LIMIT);
    const current = this.summarizeRecords(currentRows, DEFAULT_RECENT_LIMIT);

    const diffAmount = roundMoney(current.total - previous.total);
    const diffPercent =
      previous.total > 0
        ? Math.round(
            ((current.total - previous.total) / previous.total) * 1000,
          ) / 10
        : null;

    const topCategoryChanges = this.computeCategoryChanges(
      previous.byCategory,
      current.byCategory,
    );

    return {
      previous,
      current,
      diffAmount,
      diffPercent,
      topCategoryChanges,
    };
  }

  private summarizeRecords(
    rows: RecordWithCategory[],
    recentLimit: number,
  ): QueryRecordsSummary {
    let total = 0;
    const categoryMap = new Map<string, CategoryTotalItem>();

    for (const row of rows) {
      total += row.amount;
      const existing = categoryMap.get(row.categoryId);
      if (existing) {
        existing.total = roundMoney(existing.total + row.amount);
        existing.count += 1;
      } else {
        categoryMap.set(row.categoryId, {
          categoryId: row.categoryId,
          categoryName: row.categoryName,
          categoryType: row.categoryType,
          categoryEmoji: row.categoryEmoji,
          total: roundMoney(row.amount),
          count: 1,
        });
      }
    }

    const byCategory = Array.from(categoryMap.values()).sort(
      (a, b) => b.total - a.total,
    );

    return {
      total: roundMoney(total),
      totalCount: rows.length,
      byCategory,
      recentRecords: rows.slice(0, recentLimit),
    };
  }

  private computeCategoryChanges(
    previousCategories: CategoryTotalItem[],
    currentCategories: CategoryTotalItem[],
  ): CategoryDiffItem[] {
    const map = new Map<string, CategoryDiffItem>();

    for (const item of previousCategories) {
      map.set(item.categoryId, {
        categoryName: item.categoryName,
        categoryEmoji: item.categoryEmoji,
        previousTotal: item.total,
        currentTotal: 0,
        diffAmount: roundMoney(-item.total),
      });
    }

    for (const item of currentCategories) {
      const existing = map.get(item.categoryId);
      if (existing) {
        existing.currentTotal = item.total;
        existing.diffAmount = roundMoney(item.total - existing.previousTotal);
      } else {
        map.set(item.categoryId, {
          categoryName: item.categoryName,
          categoryEmoji: item.categoryEmoji,
          previousTotal: 0,
          currentTotal: item.total,
          diffAmount: item.total,
        });
      }
    }

    return Array.from(map.values())
      .sort((a, b) => Math.abs(b.diffAmount) - Math.abs(a.diffAmount))
      .slice(0, TOP_CATEGORY_CHANGES_LIMIT);
  }
}
