export type PendingAction = 'awaiting_category_name';

export type CategoryTypeValue = 'gasto' | 'ingreso' | 'ahorro';

export interface CategoryPendingData {
  type: CategoryTypeValue;
}

export interface ConversationStateRecord {
  userId: string;
  pendingAction: PendingAction | null;
  pendingData: CategoryPendingData | null;
  lastBotMsg: string | null;
  expiresAt: Date | null;
  updatedAt: Date;
}

export interface SaveConversationStateInput {
  userId: string;
  pendingAction: PendingAction;
  pendingData?: CategoryPendingData;
  lastBotMsg?: string;
  ttlMinutes?: number;
}

export type ActiveStateResult =
  | { state: ConversationStateRecord; expired: false }
  | { state: null; expired: boolean };
