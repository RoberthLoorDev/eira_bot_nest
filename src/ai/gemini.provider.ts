import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { extractedRecordSchema } from './ai.schema';
import { AiExtractionProvider } from './ai.types';

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

@Injectable()
export class GeminiProvider implements AiExtractionProvider {
  readonly name = 'gemini';
  private readonly client: GoogleGenAI | null;
  private readonly model: string;
  private readonly jsonSchema: Record<string, unknown>;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    this.client = apiKey ? new GoogleGenAI({ apiKey }) : null;
    this.model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
    this.jsonSchema = z.toJSONSchema(extractedRecordSchema);
  }

  async extractJson(
    systemPrompt: string,
    userMessage: string,
  ): Promise<string> {
    if (!this.client) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: userMessage,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0,
        responseMimeType: 'application/json',
        responseJsonSchema: this.jsonSchema,
      },
    });

    if (!response.text) {
      throw new Error('Gemini returned empty text');
    }

    return response.text;
  }
}
