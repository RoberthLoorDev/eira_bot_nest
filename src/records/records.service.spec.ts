import { Test, TestingModule } from '@nestjs/testing';
import { RecordsRepository } from './records.repository';
import { RecordsService } from './records.service';
import {
  CreateRecordInput,
  QueryRecordsRangeInput,
  RecordItem,
  RecordWithCategory,
} from './records.types';

interface MockRecordsRepository {
  createRecord: jest.Mock<Promise<RecordItem>, [CreateRecordInput]>;
  findActiveByRange: jest.Mock<
    Promise<RecordWithCategory[]>,
    [QueryRecordsRangeInput]
  >;
}

describe('RecordsService', () => {
  let service: RecordsService;
  let repository: MockRecordsRepository;

  beforeEach(async () => {
    repository = {
      createRecord: jest.fn<Promise<RecordItem>, [CreateRecordInput]>(),
      findActiveByRange: jest.fn<
        Promise<RecordWithCategory[]>,
        [QueryRecordsRangeInput]
      >(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordsService,
        { provide: RecordsRepository, useValue: repository },
      ],
    }).compile();

    service = module.get<RecordsService>(RecordsService);
  });

  it('rejects non-positive amounts', async () => {
    const result = await service.createForUser({
      userId: 'u1',
      categoryId: 'c1',
      amount: 0,
      description: 'Test',
      occurredAt: new Date(),
    });

    expect(result).toEqual({ ok: false, reason: 'invalid_amount' });
    expect(repository.createRecord).not.toHaveBeenCalled();
  });

  it('rejects empty descriptions', async () => {
    const result = await service.createForUser({
      userId: 'u1',
      categoryId: 'c1',
      amount: 25,
      description: '   ',
      occurredAt: new Date(),
    });

    expect(result).toEqual({ ok: false, reason: 'invalid_description' });
    expect(repository.createRecord).not.toHaveBeenCalled();
  });

  it('rounds amount to 2 decimals and trims description', async () => {
    const occurredAt = new Date('2026-11-19T02:00:00.000Z');
    const saved: RecordItem = {
      id: 'r1',
      userId: 'u1',
      categoryId: 'c1',
      amount: '25.56',
      description: 'Mando PS5',
      occurredAt,
      createdAt: occurredAt,
    };
    repository.createRecord.mockResolvedValue(saved);

    const result = await service.createForUser({
      userId: 'u1',
      categoryId: 'c1',
      amount: 25.556,
      description: '  Mando PS5  ',
      occurredAt,
    });

    expect(repository.createRecord).toHaveBeenCalledWith({
      userId: 'u1',
      categoryId: 'c1',
      amount: 25.56,
      description: 'Mando PS5',
      occurredAt,
    });
    expect(result).toEqual({ ok: true, record: saved });
  });

  it('summarizes records by category and caps recent records to limit', async () => {
    const rows: RecordWithCategory[] = [
      {
        id: '1',
        userId: 'u1',
        categoryId: 'c-food',
        categoryName: 'Comida',
        categoryType: 'gasto',
        categoryEmoji: '🍔',
        amount: 12.5,
        amountFormatted: '12.50',
        description: 'Almuerzo',
        occurredAt: new Date('2026-11-20T18:00:00.000Z'),
      },
      {
        id: '2',
        userId: 'u1',
        categoryId: 'c-food',
        categoryName: 'Comida',
        categoryType: 'gasto',
        categoryEmoji: '🍔',
        amount: 0.25,
        amountFormatted: '0.25',
        description: 'Chicle',
        occurredAt: new Date('2026-11-20T17:00:00.000Z'),
      },
      {
        id: '3',
        userId: 'u1',
        categoryId: 'c-games',
        categoryName: 'Juegos',
        categoryType: 'gasto',
        categoryEmoji: null,
        amount: 25,
        amountFormatted: '25.00',
        description: 'Mando PS5',
        occurredAt: new Date('2026-11-19T15:00:00.000Z'),
      },
    ];
    repository.findActiveByRange.mockResolvedValue(rows);

    const summary = await service.queryByRange({
      userId: 'u1',
      startUtc: new Date('2026-11-01T05:00:00.000Z'),
      endExclusiveUtc: new Date('2026-11-21T05:00:00.000Z'),
      recentLimit: 2,
    });

    expect(summary.total).toBe(37.75);
    expect(summary.totalCount).toBe(3);
    expect(summary.recentRecords).toHaveLength(2);
    expect(summary.byCategory[0]?.categoryName).toBe('Juegos');
    expect(summary.byCategory[1]?.total).toBe(12.75);
  });

  it('compares two ranges and handles zero previous total safely', async () => {
    repository.findActiveByRange
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: '1',
          userId: 'u1',
          categoryId: 'c1',
          categoryName: 'Comida',
          categoryType: 'gasto',
          categoryEmoji: null,
          amount: 40,
          amountFormatted: '40.00',
          description: 'Cena',
          occurredAt: new Date('2026-11-20T18:00:00.000Z'),
        },
      ]);

    const comparison = await service.compareRanges(
      {
        userId: 'u1',
        startUtc: new Date('2026-10-01T05:00:00.000Z'),
        endExclusiveUtc: new Date('2026-11-01T05:00:00.000Z'),
      },
      {
        userId: 'u1',
        startUtc: new Date('2026-11-01T05:00:00.000Z'),
        endExclusiveUtc: new Date('2026-11-21T05:00:00.000Z'),
      },
    );

    expect(comparison.previous.total).toBe(0);
    expect(comparison.current.total).toBe(40);
    expect(comparison.diffAmount).toBe(40);
    expect(comparison.diffPercent).toBeNull();
    expect(comparison.topCategoryChanges[0]?.categoryName).toBe('Comida');
  });
});
