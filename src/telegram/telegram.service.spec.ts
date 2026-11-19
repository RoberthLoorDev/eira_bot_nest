import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from '../ai/ai.service';
import { CategoriesService } from '../categories/categories.service';
import { ConversationService } from '../conversation/conversation.service';
import { RecordsService } from '../records/records.service';
import { TelegramMiddleware } from './telegram.middleware';
import {
  buildMainMenuKeyboard,
  buildRecordConfirmKeyboard,
  formatGroupedCategories,
} from './telegram.menu';
import { TelegramService } from './telegram.service';

describe('TelegramService', () => {
  let service: TelegramService;

  beforeEach(async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramService,
        { provide: TelegramMiddleware, useValue: { handle: jest.fn() } },
        {
          provide: ConversationService,
          useValue: {
            getActiveState: jest.fn(),
            setState: jest.fn(),
            clearState: jest.fn(),
          },
        },
        {
          provide: CategoriesService,
          useValue: {
            listGroupedByUser: jest.fn(),
            listActiveByUser: jest.fn(),
            listByUserAndType: jest.fn(),
            findActiveById: jest.fn(),
            createForUser: jest.fn(),
          },
        },
        {
          provide: RecordsService,
          useValue: {
            createForUser: jest.fn(),
          },
        },
        {
          provide: AiService,
          useValue: {
            extractRecord: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TelegramService>(TelegramService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should keep all inline callback_data values within 64 bytes', () => {
    const keyboards = [
      buildMainMenuKeyboard().reply_markup,
      buildRecordConfirmKeyboard().reply_markup,
    ];

    for (const markup of keyboards) {
      for (const row of markup.inline_keyboard) {
        for (const button of row) {
          expect(
            Buffer.byteLength(button.callback_data, 'utf8'),
          ).toBeLessThanOrEqual(64);
        }
      }
    }
  });

  it('should format grouped categories by type', () => {
    const text = formatGroupedCategories({
      gasto: [
        {
          id: '1',
          userId: 'u1',
          name: 'Gastos generales',
          type: 'gasto',
          emoji: null,
          isDefault: true,
        },
      ],
      ingreso: [],
      ahorro: [],
    });

    expect(text).toContain('Gastos generales (por defecto)');
    expect(text).toContain('Sin categorías todavía');
  });
});
