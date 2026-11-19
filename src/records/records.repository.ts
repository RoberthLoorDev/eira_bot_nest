import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecordInput, RecordItem } from './records.types';

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
}
