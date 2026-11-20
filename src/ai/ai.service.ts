import { Injectable, Logger } from '@nestjs/common';
import { CategoryItem } from '../categories/categories.types';
import {
  getLocalDateString,
  getLocalWeekdayName,
  getRecentWeekdaysReference,
} from '../common/datetime.util';
import { GeminiProvider } from './gemini.provider';
import { GroqProvider } from './groq.provider';
import { extractedRecordSchema } from './ai.schema';
import {
  AiExtractionProvider,
  ExtractedRecordPayload,
  ExtractRecordInput,
  ExtractRecordResult,
  TranscribeAudioInput,
  TranscribeAudioResult,
} from './ai.types';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly groqProvider: GroqProvider,
    private readonly geminiProvider: GeminiProvider,
  ) {}

  async extractRecord(input: ExtractRecordInput): Promise<ExtractRecordResult> {
    const systemPrompt = this.buildSystemPrompt(input);
    const providers: AiExtractionProvider[] = [
      this.groqProvider,
      this.geminiProvider,
    ];

    for (const provider of providers) {
      try {
        const rawJson = await provider.extractJson(systemPrompt, input.text);
        const parsed = this.parseAndValidate(rawJson, input.forcedType);
        return { ok: true, data: parsed, provider: provider.name };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : 'Unknown provider error';
        this.logger.warn(`AI provider "${provider.name}" failed: ${message}`);
      }
    }

    return { ok: false, reason: 'ai_unavailable' };
  }

  async transcribeAudio(
    input: TranscribeAudioInput,
  ): Promise<TranscribeAudioResult> {
    try {
      const rawText = await this.groqProvider.transcribeAudio(input);
      const trimmed = rawText.trim();
      if (!trimmed) {
        return { ok: false, reason: 'empty_transcription' };
      }
      return { ok: true, text: trimmed };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown STT error';
      this.logger.warn(`Groq Whisper transcription failed: ${message}`);
      return { ok: false, reason: 'stt_unavailable' };
    }
  }

  private parseAndValidate(
    rawJson: string,
    forcedType?: ExtractRecordInput['forcedType'],
  ): ExtractedRecordPayload {
    const decoded: unknown = JSON.parse(rawJson);
    const validated = extractedRecordSchema.parse(decoded);

    if (forcedType) {
      return {
        ...validated,
        intent: 'create_record',
        type: forcedType,
      };
    }

    return validated;
  }

  private buildSystemPrompt(input: ExtractRecordInput): string {
    const localToday = getLocalDateString(input.nowUtc, input.userTimezone);
    const localWeekday = getLocalWeekdayName(input.nowUtc, input.userTimezone);
    const recentWeekdays = getRecentWeekdaysReference(
      input.nowUtc,
      input.userTimezone,
    );
    const categoryList = this.formatCategoryList(input.categories);
    const intentRule = input.forcedType
      ? `The user already selected type="${input.forcedType}". Always set intent="create_record" and type="${input.forcedType}".`
      : [
          'Classify intent into:',
          '- "create_record": user wants to record a new expense, income, or saving.',
          '- "query_records": user asks to view, list, or sum their movements for a date or date range.',
          '- "compare_records": user asks to compare movements between two periods or two dates.',
          '- "list_categories": user asks to list, show, or remind them of their categories.',
          '- "create_category": user wants to create or add a new category (put the requested name in categoryName and type if mentioned).',
          '- "unknown": unrelated chat or greeting.',
        ].join('\n');

    return [
      'You extract personal finance intents and dates from Spanish text into strict JSON.',
      `User local today: ${localWeekday} ${localToday} (timezone: ${input.userTimezone}).`,
      `Recent past weekdays: ${recentWeekdays}.`,
      intentRule,
      `User existing categories: ${categoryList}`,
      'Return ONLY a JSON object with keys: intent, type, amount, description, categoryName, occurredAtDate, startDate, endDate, compareStartDate, compareEndDate.',
      'Rules:',
      '- type: set "gasto" whenever user mentions gastos/gasté/compras, "ingreso" for ingresos/gané/sueldo, "ahorro" for ahorros/ahorré. Use null ONLY if user asks for all movements without specifying type.',
      '- amount: for create_record, positive decimal number in dollars (e.g. "25 centavos" -> 0.25, "50 ctvs" -> 0.5, "1,25" -> 1.25), otherwise null. Ignore street or date numbers.',
      '- description: for create_record, short clean summary, otherwise null.',
      '- categoryName: if the user mentions a category or budget name (e.g. "en Comida", "en Navidad", "gastos hormiga"), return the matching existing category name if it exists, OR that exact mentioned name even if not in the list. Otherwise null.',
      '- occurredAtDate: for create_record, "YYYY-MM-DD" in user local date only if user mentions a date (e.g. "ayer"), otherwise null.',
      '- Date resolution rule: weekdays without year (e.g. "el jueves" when today is Friday) ALWAYS refer to the most recent PAST occurrence, NEVER the future. Weeks run Monday to Sunday.',
      '- For query_records: set startDate and endDate ("YYYY-MM-DD", inclusive). Single day uses the same date for both. "este mes" = 1st of current month to today. "mes pasado" = full previous calendar month. "semana pasada" = previous Monday to Sunday. "hace dos semanas" = Monday to Sunday of two weeks ago.',
      '- For compare_records: set compareStartDate/compareEndDate as the OLDER/baseline period (e.g. mes pasado) and startDate/endDate as the NEWER/target period (e.g. este mes).',
      '- Set unused date fields to null.',
    ].join('\n');
  }

  private formatCategoryList(categories: CategoryItem[]): string {
    if (categories.length === 0) {
      return '(none)';
    }
    return categories.map((c) => `${c.name} [${c.type}]`).join(', ');
  }
}
