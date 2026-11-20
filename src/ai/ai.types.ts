import {
  CategoryItem,
  CategoryTypeValue,
} from '../categories/categories.types';

export type AiIntent =
  | 'create_record'
  | 'query_records'
  | 'compare_records'
  | 'list_categories'
  | 'create_category'
  | 'unknown';

export interface ExtractedRecordPayload {
  intent: AiIntent;
  type: CategoryTypeValue | null;
  amount: number | null;
  description: string | null;
  categoryName: string | null;
  occurredAtDate: string | null;
  startDate: string | null;
  endDate: string | null;
  compareStartDate: string | null;
  compareEndDate: string | null;
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

export interface TranscribeAudioInput {
  audioBuffer: Buffer;
  filename: string;
  mimeType: string;
  language?: string;
}

export type TranscribeAudioResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'empty_transcription' | 'stt_unavailable' };

export interface AiTranscriptionProvider {
  readonly name: string;
  transcribeAudio(input: TranscribeAudioInput): Promise<string>;
}
