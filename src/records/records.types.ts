import { CategoryTypeValue } from '../categories/categories.types';

export interface CreateRecordInput {
  userId: string;
  categoryId: string;
  amount: number;
  description: string;
  notes?: string;
  occurredAt: Date;
}

export interface RecordItem {
  id: string;
  userId: string;
  categoryId: string;
  amount: string;
  description: string;
  occurredAt: Date;
  createdAt: Date;
}

export type CreateRecordResult =
  | { ok: true; record: RecordItem }
  | { ok: false; reason: 'invalid_amount' | 'invalid_description' };

export interface RecordWithCategory {
  id: string;
  userId: string;
  categoryId: string;
  categoryName: string;
  categoryType: CategoryTypeValue;
  categoryEmoji: string | null;
  amount: number;
  amountFormatted: string;
  description: string;
  occurredAt: Date;
}

export interface QueryRecordsRangeInput {
  userId: string;
  startUtc: Date;
  endExclusiveUtc: Date;
  type?: CategoryTypeValue;
  categoryId?: string;
  recentLimit?: number;
}

export interface CategoryTotalItem {
  categoryId: string;
  categoryName: string;
  categoryType: CategoryTypeValue;
  categoryEmoji: string | null;
  total: number;
  count: number;
}

export interface QueryRecordsSummary {
  total: number;
  totalCount: number;
  byCategory: CategoryTotalItem[];
  recentRecords: RecordWithCategory[];
}

export interface CategoryDiffItem {
  categoryName: string;
  categoryEmoji: string | null;
  previousTotal: number;
  currentTotal: number;
  diffAmount: number;
}

export interface CompareRecordsSummary {
  previous: QueryRecordsSummary;
  current: QueryRecordsSummary;
  diffAmount: number;
  diffPercent: number | null;
  topCategoryChanges: CategoryDiffItem[];
}
