import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';
import { AiExtractionProvider } from './ai.types';

const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-20b';

@Injectable()
export class GroqProvider implements AiExtractionProvider {
  readonly name = 'groq';
  private readonly client: Groq | null;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    this.client = apiKey ? new Groq({ apiKey }) : null;
    this.model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
  }

  async extractJson(
    systemPrompt: string,
    userMessage: string,
  ): Promise<string> {
    if (!this.client) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    const completion = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Groq returned empty content');
    }

    return content;
  }
}
