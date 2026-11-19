import { Injectable } from '@nestjs/common';
import { ConversationState, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CategoryPendingData,
  CategoryTypeValue,
  ConversationStateRecord,
  PendingAction,
  SaveConversationStateInput,
} from './conversation.types';

function isPendingAction(value: string | null): value is PendingAction {
  return value === 'awaiting_category_name';
}

function isCategoryTypeValue(value: unknown): value is CategoryTypeValue {
  return value === 'gasto' || value === 'ingreso' || value === 'ahorro';
}

function isCategoryPendingData(
  value: Prisma.JsonValue | null,
): value is Prisma.JsonObject & CategoryPendingData {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  return isCategoryTypeValue(value.type);
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
    const pendingDataValue: Prisma.InputJsonValue | typeof Prisma.DbNull =
      input.pendingData ? { type: input.pendingData.type } : Prisma.DbNull;
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
    const pendingAction = isPendingAction(row.pendingAction)
      ? row.pendingAction
      : null;
    const pendingData: CategoryPendingData | null = isCategoryPendingData(
      row.pendingData,
    )
      ? { type: row.pendingData.type }
      : null;

    return {
      userId: row.userId,
      pendingAction,
      pendingData,
      lastBotMsg: row.lastBotMsg,
      expiresAt: row.expiresAt,
      updatedAt: row.updatedAt,
    };
  }
}
