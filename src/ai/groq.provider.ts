import { Injectable } from '@nestjs/common';
import Groq from 'groq-sdk';
import {
  AiExtractionProvider,
  AiTranscriptionProvider,
  TranscribeAudioInput,
} from './ai.types';

const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-20b';
const DEFAULT_WHISPER_MODEL = 'whisper-large-v3-turbo';

@Injectable()
export class GroqProvider
  implements AiExtractionProvider, AiTranscriptionProvider
{
  readonly name = 'groq';
  private readonly client: Groq | null;
  private readonly model: string;
  private readonly whisperModel: string;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    this.client = apiKey ? new Groq({ apiKey }) : null;
    this.model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
    this.whisperModel = process.env.GROQ_WHISPER_MODEL || DEFAULT_WHISPER_MODEL;
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

  async transcribeAudio(input: TranscribeAudioInput): Promise<string> {
    if (!this.client) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    const file = new File([new Uint8Array(input.audioBuffer)], input.filename, {
      type: input.mimeType,
    });

    const response = await this.client.audio.transcriptions.create({
      model: this.whisperModel,
      file,
      language: input.language ?? 'es',
      temperature: 0,
    });

    return response.text;
  }
}
