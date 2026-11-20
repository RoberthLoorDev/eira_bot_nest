import { Test, TestingModule } from '@nestjs/testing';
import { CategoryItem } from '../categories/categories.types';
import { AiService } from './ai.service';
import { GeminiProvider } from './gemini.provider';
import { GroqProvider } from './groq.provider';

interface MockAiProvider {
  name: string;
  extractJson: jest.Mock<Promise<string>, [string, string]>;
  transcribeAudio?: jest.Mock<Promise<string>, [unknown]>;
}

describe('AiService', () => {
  let service: AiService;
  let groqProvider: MockAiProvider;
  let geminiProvider: MockAiProvider;

  const categories: CategoryItem[] = [
    {
      id: 'cat-1',
      userId: 'u1',
      name: 'Gastos generales',
      type: 'gasto',
      emoji: null,
      isDefault: true,
    },
  ];

  beforeEach(async () => {
    groqProvider = {
      name: 'groq',
      extractJson: jest.fn<Promise<string>, [string, string]>(),
      transcribeAudio: jest.fn<Promise<string>, [unknown]>(),
    };
    geminiProvider = {
      name: 'gemini',
      extractJson: jest.fn<Promise<string>, [string, string]>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: GroqProvider, useValue: groqProvider },
        { provide: GeminiProvider, useValue: geminiProvider },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('uses Groq as primary provider and validates create_record JSON', async () => {
    groqProvider.extractJson.mockResolvedValue(
      JSON.stringify({
        intent: 'create_record',
        type: 'gasto',
        amount: 25,
        description: 'Mando PS5',
        categoryName: 'Navidad',
        occurredAtDate: null,
        startDate: null,
        endDate: null,
        compareStartDate: null,
        compareEndDate: null,
      }),
    );

    const result = await service.extractRecord({
      text: 'Compre un mando PS5 de 25 dolares en Navidad',
      categories,
      userTimezone: 'America/Guayaquil',
      nowUtc: new Date('2026-11-19T02:00:00.000Z'),
    });

    expect(result).toEqual({
      ok: true,
      provider: 'groq',
      data: {
        intent: 'create_record',
        type: 'gasto',
        amount: 25,
        description: 'Mando PS5',
        categoryName: 'Navidad',
        occurredAtDate: null,
        startDate: null,
        endDate: null,
        compareStartDate: null,
        compareEndDate: null,
      },
    });
    expect(geminiProvider.extractJson).not.toHaveBeenCalled();
  });

  it('validates query_records and compare_records payloads', async () => {
    groqProvider.extractJson.mockResolvedValue(
      JSON.stringify({
        intent: 'compare_records',
        type: 'gasto',
        amount: null,
        description: null,
        categoryName: 'Gastos generales',
        occurredAtDate: null,
        startDate: '2026-11-01',
        endDate: '2026-11-20',
        compareStartDate: '2026-10-01',
        compareEndDate: '2026-10-31',
      }),
    );

    const result = await service.extractRecord({
      text: 'Compara mis gastos del mes pasado con este mes',
      categories,
      userTimezone: 'America/Guayaquil',
      nowUtc: new Date('2026-11-20T21:00:00.000Z'),
    });

    expect(result).toEqual({
      ok: true,
      provider: 'groq',
      data: {
        intent: 'compare_records',
        type: 'gasto',
        amount: null,
        description: null,
        categoryName: 'Gastos generales',
        occurredAtDate: null,
        startDate: '2026-11-01',
        endDate: '2026-11-20',
        compareStartDate: '2026-10-01',
        compareEndDate: '2026-10-31',
      },
    });
  });

  it('falls back to Gemini when Groq fails with 429 or invalid JSON', async () => {
    groqProvider.extractJson.mockRejectedValue(new Error('429 rate limit'));
    geminiProvider.extractJson.mockResolvedValue(
      JSON.stringify({
        intent: 'create_record',
        type: 'ingreso',
        amount: 500,
        description: 'Sueldo',
        categoryName: 'Ingresos',
        occurredAtDate: '2026-11-18',
        startDate: null,
        endDate: null,
        compareStartDate: null,
        compareEndDate: null,
      }),
    );

    const result = await service.extractRecord({
      text: 'Me pagaron 500 de sueldo ayer',
      categories,
      userTimezone: 'America/Guayaquil',
      nowUtc: new Date('2026-11-19T02:00:00.000Z'),
    });

    expect(result).toEqual({
      ok: true,
      provider: 'gemini',
      data: {
        intent: 'create_record',
        type: 'ingreso',
        amount: 500,
        description: 'Sueldo',
        categoryName: 'Ingresos',
        occurredAtDate: '2026-11-18',
        startDate: null,
        endDate: null,
        compareStartDate: null,
        compareEndDate: null,
      },
    });
  });

  it('returns ai_unavailable when both providers fail', async () => {
    groqProvider.extractJson.mockRejectedValue(new Error('Groq down'));
    geminiProvider.extractJson.mockRejectedValue(new Error('Gemini down'));

    const result = await service.extractRecord({
      text: 'Gaste 10 en almuerzo',
      categories,
      userTimezone: 'America/Guayaquil',
      nowUtc: new Date('2026-11-19T02:00:00.000Z'),
    });

    expect(result).toEqual({ ok: false, reason: 'ai_unavailable' });
  });

  it('transcribes audio using Groq Whisper and trims text', async () => {
    groqProvider.transcribeAudio?.mockResolvedValue('  Gasté 5 en café  ');

    const result = await service.transcribeAudio({
      audioBuffer: Buffer.from('ogg-bytes'),
      filename: 'voice.ogg',
      mimeType: 'audio/ogg',
      language: 'es',
    });

    expect(result).toEqual({ ok: true, text: 'Gasté 5 en café' });
  });

  it('returns empty_transcription when audio produces blank text', async () => {
    groqProvider.transcribeAudio?.mockResolvedValue('   ');

    const result = await service.transcribeAudio({
      audioBuffer: Buffer.from('ogg-bytes'),
      filename: 'voice.ogg',
      mimeType: 'audio/ogg',
    });

    expect(result).toEqual({ ok: false, reason: 'empty_transcription' });
  });

  it('returns stt_unavailable when Groq Whisper throws', async () => {
    groqProvider.transcribeAudio?.mockRejectedValue(new Error('429 limit'));

    const result = await service.transcribeAudio({
      audioBuffer: Buffer.from('ogg-bytes'),
      filename: 'voice.ogg',
      mimeType: 'audio/ogg',
    });

    expect(result).toEqual({ ok: false, reason: 'stt_unavailable' });
  });
});
