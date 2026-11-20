import { Injectable } from '@nestjs/common';
import { ConversationState, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CategoryTypeValue,
  ConversationPendingData,
  ConversationStateRecord,
  PendingAction,
  SaveConversationStateInput,
} from './conversation.types';

const VALID_PENDING_ACTIONS: ReadonlySet<string> = new Set<PendingAction>([
  'awaiting_category_name',
  'awaiting_category_type',
  'awaiting_record_input',
  'awaiting_record_amount',
  'awaiting_record_type',
  'awaiting_record_category',
  'confirm_create_record',
]);

function isPendingAction(value: string | null): value is PendingAction {
  return value !== null && VALID_PENDING_ACTIONS.has(value);
}

function isCategoryTypeValue(value: unknown): value is CategoryTypeValue {
  return value === 'gasto' || value === 'ingreso' || value === 'ahorro';
}

function parsePendingData(
  value: Prisma.JsonValue | null,
): ConversationPendingData | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const parsed: ConversationPendingData = {};
  if (isCategoryTypeValue(value.type)) {
    parsed.type = value.type;
  }
  if (typeof value.amount === 'number' && Number.isFinite(value.amount)) {
    parsed.amount = value.amount;
  }
  if (typeof value.description === 'string') {
    parsed.description = value.description;
  }
  if (typeof value.categoryId === 'string') {
    parsed.categoryId = value.categoryId;
  }
  if (typeof value.categoryName === 'string') {
    parsed.categoryName = value.categoryName;
  }
  if (typeof value.suggestedCategoryName === 'string') {
    parsed.suggestedCategoryName = value.suggestedCategoryName;
  }
  if (typeof value.occurredAtIso === 'string') {
    parsed.occurredAtIso = value.occurredAtIso;
  }

  return Object.keys(parsed).length > 0 ? parsed : null;
}

function toJsonObject(
  data: ConversationPendingData | undefined,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  if (!data) {
    return Prisma.DbNull;
  }
  const obj: Record<string, string | number> = {};
  if (data.type !== undefined) obj.type = data.type;
  if (data.amount !== undefined) obj.amount = data.amount;
  if (data.description !== undefined) obj.description = data.description;
  if (data.categoryId !== undefined) obj.categoryId = data.categoryId;
  if (data.categoryName !== undefined) obj.categoryName = data.categoryName;
  if (data.suggestedCategoryName !== undefined) {
    obj.suggestedCategoryName = data.suggestedCategoryName;
  }
  if (data.occurredAtIso !== undefined) obj.occurredAtIso = data.occurredAtIso;
  return obj;
}

@Injectable()
export class ConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<ConversationStateRecord | null> {
    const row = await this.prisma.conversationState.findUnique({
      where: { userId },
    });

    if (!row) {
      return null;
    }

    return this.mapToRecord(row);
  }

  async upsertState(
    input: SaveConversationStateInput,
    expiresAt: Date,
  ): Promise<ConversationStateRecord> {
    const pendingDataValue = toJsonObject(input.pendingData);
    const lastBotMsgValue = input.lastBotMsg ?? null;

    const row = await this.prisma.conversationState.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        pendingAction: input.pendingAction,
        pendingData: pendingDataValue,
        lastBotMsg: lastBotMsgValue,
        expiresAt,
      },
      update: {
        pendingAction: input.pendingAction,
        pendingData: pendingDataValue,
        lastBotMsg: lastBotMsgValue,
        expiresAt,
      },
    });

    return this.mapToRecord(row);
  }

  async clearByUserId(userId: string): Promise<void> {
    await this.prisma.conversationState.deleteMany({
      where: { userId },
    });
  }

  private mapToRecord(row: ConversationState): ConversationStateRecord {
    return {
      userId: row.userId,
      pendingAction: isPendingAction(row.pendingAction)
        ? row.pendingAction
        : null,
      pendingData: parsePendingData(row.pendingData),
      lastBotMsg: row.lastBotMsg,
      expiresAt: row.expiresAt,
      updatedAt: row.updatedAt,
    };
  }
}
