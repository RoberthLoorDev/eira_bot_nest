import { Injectable } from '@nestjs/common';
import { ConversationRepository } from './conversation.repository';
import {
  ActiveStateResult,
  ConversationStateRecord,
  SaveConversationStateInput,
} from './conversation.types';

const DEFAULT_TTL_MINUTES = 5;
const MS_PER_MINUTE = 60 * 1000;

@Injectable()
export class ConversationService {
  constructor(
    private readonly conversationRepository: ConversationRepository,
  ) {}

  async getActiveState(userId: string): Promise<ActiveStateResult> {
    const state = await this.conversationRepository.findByUserId(userId);

    if (!state || !state.pendingAction) {
      return { state: null, expired: false };
    }

    if (state.expiresAt && state.expiresAt.getTime() <= Date.now()) {
      await this.conversationRepository.clearByUserId(userId);
      return { state: null, expired: true };
    }

    return { state, expired: false };
  }

  async setState(
    input: SaveConversationStateInput,
  ): Promise<ConversationStateRecord> {
    const ttlMinutes = input.ttlMinutes ?? DEFAULT_TTL_MINUTES;
    const expiresAt = new Date(Date.now() + ttlMinutes * MS_PER_MINUTE);

    return this.conversationRepository.upsertState(input, expiresAt);
  }

  async clearState(userId: string): Promise<void> {
    await this.conversationRepository.clearByUserId(userId);
  }
}
