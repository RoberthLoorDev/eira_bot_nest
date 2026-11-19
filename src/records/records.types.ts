export interface CreateRecordInput {
  userId: string;
  categoryId: string;
  amount: number;
  description: string;
  notes?: string;
  occurredAt: Date;
}

export interface RecordItem {
  id: string;
  userId: string;
  categoryId: string;
  amount: string;
  description: string;
  occurredAt: Date;
  createdAt: Date;
}

export type CreateRecordResult =
  | { ok: true; record: RecordItem }
  | { ok: false; reason: 'invalid_amount' | 'invalid_description' };
