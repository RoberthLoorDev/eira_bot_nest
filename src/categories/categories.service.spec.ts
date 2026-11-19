import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { CategoriesRepository } from './categories.repository';
import { CategoriesService } from './categories.service';
import { CategoryItem, CreateCategoryInput } from './categories.types';

interface MockCategoriesRepository {
  findActiveByUserId: jest.Mock<Promise<CategoryItem[]>, [string]>;
  findActiveByNameInsensitive: jest.Mock<
    Promise<CategoryItem | null>,
    [string, string]
  >;
  createCategory: jest.Mock<Promise<CategoryItem>, [CreateCategoryInput]>;
}

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repository: MockCategoriesRepository;

  const userId = 'user-123';

  beforeEach(async () => {
    repository = {
      findActiveByUserId: jest.fn<Promise<CategoryItem[]>, [string]>(),
      findActiveByNameInsensitive: jest.fn<
        Promise<CategoryItem | null>,
        [string, string]
      >(),
      createCategory: jest.fn<Promise<CategoryItem>, [CreateCategoryInput]>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: CategoriesRepository,
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  describe('listGroupedByUser', () => {
    it('groups active categories by type', async () => {
      const items: CategoryItem[] = [
        {
          id: 'cat-1',
          userId,
          name: 'Gastos generales',
          type: 'gasto',
          emoji: null,
          isDefault: true,
        },
        {
          id: 'cat-2',
          userId,
          name: 'Comida',
          type: 'gasto',
          emoji: '🍔',
          isDefault: false,
        },
        {
          id: 'cat-3',
          userId,
          name: 'Ingresos',
          type: 'ingreso',
          emoji: null,
          isDefault: true,
        },
        {
          id: 'cat-4',
          userId,
          name: 'Ahorros',
          type: 'ahorro',
          emoji: null,
          isDefault: true,
        },
      ];

      repository.findActiveByUserId.mockResolvedValue(items);

      const result = await service.listGroupedByUser(userId);

      expect(repository.findActiveByUserId).toHaveBeenCalledWith(userId);
      expect(result).toEqual({
        gasto: [items[0], items[1]],
        ingreso: [items[2]],
        ahorro: [items[3]],
      });
    });

    it('returns empty arrays when user has no active categories', async () => {
      repository.findActiveByUserId.mockResolvedValue([]);

      const result = await service.listGroupedByUser(userId);

      expect(result).toEqual({
        gasto: [],
        ingreso: [],
        ahorro: [],
      });
    });
  });

  describe('createForUser', () => {
    it('returns invalid_name when name is empty or whitespace', async () => {
      const result = await service.createForUser({
        userId,
        name: '   ',
        type: 'gasto',
      });

      expect(result).toEqual({ ok: false, reason: 'invalid_name' });
      expect(repository.findActiveByNameInsensitive).not.toHaveBeenCalled();
      expect(repository.createCategory).not.toHaveBeenCalled();
    });

    it('returns name_too_long when trimmed name exceeds 100 characters', async () => {
      const result = await service.createForUser({
        userId,
        name: 'a'.repeat(101),
        type: 'gasto',
      });

      expect(result).toEqual({ ok: false, reason: 'name_too_long' });
      expect(repository.findActiveByNameInsensitive).not.toHaveBeenCalled();
      expect(repository.createCategory).not.toHaveBeenCalled();
    });

    it('returns duplicate when a case-insensitive match already exists', async () => {
      repository.findActiveByNameInsensitive.mockResolvedValue({
        id: 'cat-existing',
        userId,
        name: 'Comida',
        type: 'gasto',
        emoji: null,
        isDefault: false,
      });

      const result = await service.createForUser({
        userId,
        name: '  comida ',
        type: 'gasto',
      });

      expect(repository.findActiveByNameInsensitive).toHaveBeenCalledWith(
        userId,
        'comida',
      );
      expect(result).toEqual({ ok: false, reason: 'duplicate' });
      expect(repository.createCategory).not.toHaveBeenCalled();
    });

    it('returns duplicate when Prisma throws P2002 unique constraint error', async () => {
      repository.findActiveByNameInsensitive.mockResolvedValue(null);
      repository.createCategory.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.22.0',
        }),
      );

      const result = await service.createForUser({
        userId,
        name: 'Comida',
        type: 'gasto',
      });

      expect(result).toEqual({ ok: false, reason: 'duplicate' });
    });

    it('rethrows unexpected errors from repository', async () => {
      repository.findActiveByNameInsensitive.mockResolvedValue(null);
      repository.createCategory.mockRejectedValue(new Error('DB down'));

      await expect(
        service.createForUser({
          userId,
          name: 'Comida',
          type: 'gasto',
        }),
      ).rejects.toThrow('DB down');
    });

    it('creates and returns category with trimmed name', async () => {
      const created: CategoryItem = {
        id: 'cat-new',
        userId,
        name: 'Comida',
        type: 'gasto',
        emoji: '🍔',
        isDefault: false,
      };

      repository.findActiveByNameInsensitive.mockResolvedValue(null);
      repository.createCategory.mockResolvedValue(created);

      const result = await service.createForUser({
        userId,
        name: '  Comida  ',
        type: 'gasto',
        emoji: '🍔',
      });

      expect(repository.findActiveByNameInsensitive).toHaveBeenCalledWith(
        userId,
        'Comida',
      );
      expect(repository.createCategory).toHaveBeenCalledWith({
        userId,
        name: 'Comida',
        type: 'gasto',
        emoji: '🍔',
      });
      expect(result).toEqual({ ok: true, category: created });
    });
  });
});
