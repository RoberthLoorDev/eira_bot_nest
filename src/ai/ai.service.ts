import { Injectable, Logger } from '@nestjs/common';
import { CategoryItem } from '../categories/categories.types';
import { getLocalDateString } from '../common/datetime.util';
import { GeminiProvider } from './gemini.provider';
import { GroqProvider } from './groq.provider';
import { extractedRecordSchema } from './ai.schema';
import {
  AiExtractionProvider,
  ExtractedRecordPayload,
  ExtractRecordInput,
  ExtractRecordResult,
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
    const categoryList = this.formatCategoryList(input.categories);
    const typeRule = input.forcedType
      ? `The user already selected type="${input.forcedType}". Always set intent="create_record" and type="${input.forcedType}".`
      : 'Detect if the message is a financial movement (intent="create_record") or not (intent="unknown"). Set type to "gasto", "ingreso", "ahorro", or null if unclear.';

    return [
      'You extract personal finance records from Spanish text into strict JSON.',
      `User local date today: ${localToday} (timezone: ${input.userTimezone}).`,
      typeRule,
      `User existing categories: ${categoryList}`,
      'Return ONLY a JSON object with keys: intent, type, amount, description, categoryName, occurredAtDate.',
      'Rules:',
      '- amount: positive decimal number in dollars (e.g. "25 centavos" -> 0.25, "50 ctvs" -> 0.5, "1,25" -> 1.25), or null if missing. Ignore street numbers or unrelated numbers.',
      '- description: short clean summary of the item or reason, or null.',
      '- categoryName: if the user mentions a category or budget name (e.g. "en Comida", "en Navidad", "para Navidad", "categoría Transporte"), return the matching existing category name if it exists, OR that exact mentioned name even if it is not in the existing categories list. Only return null if no category or budget is mentioned.',
      '- occurredAtDate: "YYYY-MM-DD" in user local date only if user mentions a date (e.g. "ayer", "el lunes"), otherwise null.',
    ].join('\n');
  }

  private formatCategoryList(categories: CategoryItem[]): string {
    if (categories.length === 0) {
      return '(none)';
    }
    return categories.map((c) => `${c.name} [${c.type}]`).join(', ');
  }
}
