import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CategoryItem, CreateCategoryInput } from './categories.types';

const CATEGORY_SELECT = {
  id: true,
  userId: true,
  name: true,
  type: true,
  emoji: true,
  isDefault: true,
} as const;

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByUserId(userId: string): Promise<CategoryItem[]> {
    return this.prisma.category.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ type: 'asc' }, { isDefault: 'desc' }, { name: 'asc' }],
      select: CATEGORY_SELECT,
    });
  }

  async findActiveById(
    userId: string,
    categoryId: string,
  ): Promise<CategoryItem | null> {
    return this.prisma.category.findFirst({
      where: { id: categoryId, userId, deletedAt: null },
      select: CATEGORY_SELECT,
    });
  }

  async findActiveByNameInsensitive(
    userId: string,
    name: string,
  ): Promise<CategoryItem | null> {
    return this.prisma.category.findFirst({
      where: {
        userId,
        deletedAt: null,
        name: { equals: name, mode: 'insensitive' },
      },
      select: CATEGORY_SELECT,
    });
  }

  async createCategory(input: CreateCategoryInput): Promise<CategoryItem> {
    return this.prisma.category.create({
      data: {
        userId: input.userId,
        name: input.name,
        type: input.type,
        emoji: input.emoji ?? null,
      },
      select: CATEGORY_SELECT,
    });
  }
}
