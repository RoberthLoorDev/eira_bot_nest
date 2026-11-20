import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateRecordInput,
  QueryRecordsRangeInput,
  RecordItem,
  RecordWithCategory,
} from './records.types';

@Injectable()
export class RecordsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createRecord(input: CreateRecordInput): Promise<RecordItem> {
    const row = await this.prisma.record.create({
      data: {
        userId: input.userId,
        categoryId: input.categoryId,
        amount: input.amount,
        description: input.description,
        notes: input.notes ?? null,
        occurredAt: input.occurredAt,
      },
      select: {
        id: true,
        userId: true,
        categoryId: true,
        amount: true,
        description: true,
        occurredAt: true,
        createdAt: true,
      },
    });

    return {
      id: row.id,
      userId: row.userId,
      categoryId: row.categoryId,
      amount: row.amount.toFixed(2),
      description: row.description,
      occurredAt: row.occurredAt,
      createdAt: row.createdAt,
    };
  }

  async findActiveByRange(
    input: QueryRecordsRangeInput,
  ): Promise<RecordWithCategory[]> {
    const rows = await this.prisma.record.findMany({
      where: {
        userId: input.userId,
        isDeleted: false,
        occurredAt: {
          gte: input.startUtc,
          lt: input.endExclusiveUtc,
        },
        ...(input.categoryId ? { categoryId: input.categoryId } : {}),
        ...(input.type ? { category: { type: input.type } } : {}),
      },
      orderBy: { occurredAt: 'desc' },
      select: {
        id: true,
        userId: true,
        categoryId: true,
        amount: true,
        description: true,
        occurredAt: true,
        category: {
          select: {
            name: true,
            type: true,
            emoji: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      categoryId: row.categoryId,
      categoryName: row.category.name,
      categoryType: row.category.type,
      categoryEmoji: row.category.emoji,
      amount: Number(row.amount),
      amountFormatted: row.amount.toFixed(2),
      description: row.description,
      occurredAt: row.occurredAt,
    }));
  }
}
