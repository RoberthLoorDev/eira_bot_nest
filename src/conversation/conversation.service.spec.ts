import { Test, TestingModule } from '@nestjs/testing';
import { ConversationRepository } from './conversation.repository';
import { ConversationService } from './conversation.service';
import {
  ConversationStateRecord,
  SaveConversationStateInput,
} from './conversation.types';

interface MockConversationRepository {
  findByUserId: jest.Mock<Promise<ConversationStateRecord | null>, [string]>;
  upsertState: jest.Mock<
    Promise<ConversationStateRecord>,
    [SaveConversationStateInput, Date]
  >;
  clearByUserId: jest.Mock<Promise<void>, [string]>;
}

describe('ConversationService', () => {
  let service: ConversationService;
  let repository: MockConversationRepository;

  const userId = '11111111-1111-1111-1111-111111111111';

  beforeEach(async () => {
    repository = {
      findByUserId: jest.fn<
        Promise<ConversationStateRecord | null>,
        [string]
      >(),
      upsertState: jest.fn<
        Promise<ConversationStateRecord>,
        [SaveConversationStateInput, Date]
      >(),
      clearByUserId: jest.fn<Promise<void>, [string]>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationService,
        {
          provide: ConversationRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<ConversationService>(ConversationService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getActiveState', () => {
    it('should return active state when present and not expired', async () => {
      const now = 1_700_000_000_000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const activeRecord: ConversationStateRecord = {
        userId,
        pendingAction: 'awaiting_category_name',
        pendingData: { type: 'gasto' },
        lastBotMsg: 'What is the category name?',
        expiresAt: new Date(now + 60_000),
        updatedAt: new Date(now),
      };
      repository.findByUserId.mockResolvedValue(activeRecord);

      const result = await service.getActiveState(userId);

      expect(result).toEqual({ state: activeRecord, expired: false });
      expect(repository.clearByUserId).not.toHaveBeenCalled();
    });

    it('should return null with expired=false when no state exists', async () => {
      repository.findByUserId.mockResolvedValue(null);

      const result = await service.getActiveState(userId);

      expect(result).toEqual({ state: null, expired: false });
      expect(repository.clearByUserId).not.toHaveBeenCalled();
    });

    it('should return null with expired=false when pendingAction is null', async () => {
      const recordWithoutAction: ConversationStateRecord = {
        userId,
        pendingAction: null,
        pendingData: null,
        lastBotMsg: null,
        expiresAt: new Date(Date.now() + 60_000),
        updatedAt: new Date(),
      };
      repository.findByUserId.mockResolvedValue(recordWithoutAction);

      const result = await service.getActiveState(userId);

      expect(result).toEqual({ state: null, expired: false });
      expect(repository.clearByUserId).not.toHaveBeenCalled();
    });

    it('should delete state and return expired=true when state is expired', async () => {
      const now = 1_700_000_000_000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const expiredRecord: ConversationStateRecord = {
        userId,
        pendingAction: 'awaiting_category_name',
        pendingData: { type: 'ingreso' },
        lastBotMsg: 'Send category name',
        expiresAt: new Date(now),
        updatedAt: new Date(now - 300_000),
      };
      repository.findByUserId.mockResolvedValue(expiredRecord);
      repository.clearByUserId.mockResolvedValue(undefined);

      const result = await service.getActiveState(userId);

      expect(repository.clearByUserId).toHaveBeenCalledWith(userId);
      expect(result).toEqual({ state: null, expired: true });
    });
  });

  describe('setState', () => {
    it('should save state with default 5-minute TTL when ttlMinutes is omitted', async () => {
      const now = 1_700_000_000_000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const input: SaveConversationStateInput = {
        userId,
        pendingAction: 'awaiting_category_name',
        pendingData: { type: 'ahorro' },
        lastBotMsg: 'Enter category name',
      };
      const expectedExpiresAt = new Date(now + 5 * 60 * 1000);
      const savedRecord: ConversationStateRecord = {
        userId,
        pendingAction: 'awaiting_category_name',
        pendingData: { type: 'ahorro' },
        lastBotMsg: 'Enter category name',
        expiresAt: expectedExpiresAt,
        updatedAt: new Date(now),
      };
      repository.upsertState.mockResolvedValue(savedRecord);

      const result = await service.setState(input);

      expect(repository.upsertState).toHaveBeenCalledWith(
        input,
        expectedExpiresAt,
      );
      expect(result).toEqual(savedRecord);
    });

    it('should save state with custom TTL when ttlMinutes is provided', async () => {
      const now = 1_700_000_000_000;
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const input: SaveConversationStateInput = {
        userId,
        pendingAction: 'awaiting_category_name',
        ttlMinutes: 10,
      };
      const expectedExpiresAt = new Date(now + 10 * 60 * 1000);
      const savedRecord: ConversationStateRecord = {
        userId,
        pendingAction: 'awaiting_category_name',
        pendingData: null,
        lastBotMsg: null,
        expiresAt: expectedExpiresAt,
        updatedAt: new Date(now),
      };
      repository.upsertState.mockResolvedValue(savedRecord);

      const result = await service.setState(input);

      expect(repository.upsertState).toHaveBeenCalledWith(
        input,
        expectedExpiresAt,
      );
      expect(result).toEqual(savedRecord);
    });
  });

  describe('clearState', () => {
    it('should delegate clearing state to repository', async () => {
      repository.clearByUserId.mockResolvedValue(undefined);

      await service.clearState(userId);

      expect(repository.clearByUserId).toHaveBeenCalledWith(userId);
    });
  });
});
