import {
  CategoryItem,
  CategoryTypeValue,
} from '../categories/categories.types';

export type AiIntent = 'create_record' | 'unknown';

export interface ExtractedRecordPayload {
  intent: AiIntent;
  type: CategoryTypeValue | null;
  amount: number | null;
  description: string | null;
  categoryName: string | null;
  occurredAtDate: string | null;
}

export interface ExtractRecordInput {
  text: string;
  categories: CategoryItem[];
  userTimezone: string;
  nowUtc: Date;
  forcedType?: CategoryTypeValue;
}

export type ExtractRecordResult =
  | { ok: true; data: ExtractedRecordPayload; provider: string }
  | { ok: false; reason: 'ai_unavailable' };

export interface AiExtractionProvider {
  readonly name: string;
  extractJson(systemPrompt: string, userMessage: string): Promise<string>;
}
