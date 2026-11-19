export type PendingAction =
  | 'awaiting_category_name'
  | 'awaiting_record_input'
  | 'awaiting_record_amount'
  | 'awaiting_record_type'
  | 'awaiting_record_category'
  | 'confirm_create_record';

export type CategoryTypeValue = 'gasto' | 'ingreso' | 'ahorro';

export interface RecordDraftPendingData {
  type?: CategoryTypeValue;
  amount?: number;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  suggestedCategoryName?: string;
  occurredAtIso?: string;
}

export type ConversationPendingData = RecordDraftPendingData;

export interface ConversationStateRecord {
  userId: string;
  pendingAction: PendingAction | null;
  pendingData: ConversationPendingData | null;
  lastBotMsg: string | null;
  expiresAt: Date | null;
  updatedAt: Date;
}

export interface SaveConversationStateInput {
  userId: string;
  pendingAction: PendingAction;
  pendingData?: ConversationPendingData;
  lastBotMsg?: string;
  ttlMinutes?: number;
}

export type ActiveStateResult =
  | { state: ConversationStateRecord; expired: false }
  | { state: null; expired: boolean };
