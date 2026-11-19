import { Test, TestingModule } from '@nestjs/testing';
import { RecordsRepository } from './records.repository';
import { RecordsService } from './records.service';
import { CreateRecordInput, RecordItem } from './records.types';

interface MockRecordsRepository {
  createRecord: jest.Mock<Promise<RecordItem>, [CreateRecordInput]>;
}

describe('RecordsService', () => {
  let service: RecordsService;
  let repository: MockRecordsRepository;

  beforeEach(async () => {
    repository = {
      createRecord: jest.fn<Promise<RecordItem>, [CreateRecordInput]>(),
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
});
