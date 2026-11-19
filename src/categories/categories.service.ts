import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CategoriesRepository } from './categories.repository';
import {
  CreateCategoryInput,
  CreateCategoryResult,
  GroupedCategories,
} from './categories.types';

const MAX_CATEGORY_NAME_LENGTH = 100;

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async listGroupedByUser(userId: string): Promise<GroupedCategories> {
    const categories =
      await this.categoriesRepository.findActiveByUserId(userId);

    const grouped: GroupedCategories = {
      gasto: [],
      ingreso: [],
      ahorro: [],
    };

    for (const category of categories) {
      grouped[category.type].push(category);
    }

    return grouped;
  }

  async createForUser(
    input: CreateCategoryInput,
  ): Promise<CreateCategoryResult> {
    const trimmedName = input.name.trim();

    if (trimmedName.length === 0) {
      return { ok: false, reason: 'invalid_name' };
    }

    if (trimmedName.length > MAX_CATEGORY_NAME_LENGTH) {
      return { ok: false, reason: 'name_too_long' };
    }

    const existing =
      await this.categoriesRepository.findActiveByNameInsensitive(
        input.userId,
        trimmedName,
      );

    if (existing) {
      return { ok: false, reason: 'duplicate' };
    }

    try {
      const category = await this.categoriesRepository.createCategory({
        userId: input.userId,
        name: trimmedName,
        type: input.type,
        emoji: input.emoji,
      });

      return { ok: true, category };
    } catch (error: unknown) {
      // Handle race conditions against the case-sensitive unique constraint.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { ok: false, reason: 'duplicate' };
      }
      throw error;
    }
  }
}
