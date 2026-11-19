import { Injectable } from '@nestjs/common';
import { RecordsRepository } from './records.repository';
import { CreateRecordInput, CreateRecordResult } from './records.types';

const MAX_DESCRIPTION_LENGTH = 500;

@Injectable()
export class RecordsService {
  constructor(private readonly recordsRepository: RecordsRepository) {}

  async createForUser(input: CreateRecordInput): Promise<CreateRecordResult> {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      return { ok: false, reason: 'invalid_amount' };
    }

    const trimmedDescription = input.description.trim();
    if (!trimmedDescription) {
      return { ok: false, reason: 'invalid_description' };
    }

    const safeDescription =
      trimmedDescription.length > MAX_DESCRIPTION_LENGTH
        ? trimmedDescription.slice(0, MAX_DESCRIPTION_LENGTH)
        : trimmedDescription;

    const record = await this.recordsRepository.createRecord({
      ...input,
      amount: Math.round(input.amount * 100) / 100,
      description: safeDescription,
    });

    return { ok: true, record };
  }
}
