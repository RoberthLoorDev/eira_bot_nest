import { Context } from 'telegraf';

export interface AuthenticatedUser {
  id: string;
  telegramId: bigint;
  name: string;
  timezone: string;
}

export interface BotState {
  user?: AuthenticatedUser;
}

export interface BotContext extends Context {
  readonly state: BotState;
}

function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.telegramId === 'bigint' &&
    typeof candidate.name === 'string' &&
    typeof candidate.timezone === 'string'
  );
}

export function setAuthenticatedUser(
  ctx: Context,
  user: AuthenticatedUser,
): void {
  const state: Record<string, unknown> = ctx.state;
  state.user = user;
}

export function getAuthenticatedUser(ctx: Context): AuthenticatedUser | null {
  const state: Record<string, unknown> = ctx.state;
  const candidate = state.user;
  return isAuthenticatedUser(candidate) ? candidate : null;
}

export interface InlineButtonItem {
  text: string;
  callback_data: string;
}

export interface InlineKeyboardReplyExtra {
  reply_markup: {
    inline_keyboard: InlineButtonItem[][];
  };
}

export const CALLBACK_DATA = {
  MENU_MAIN: 'menu:main',
  CAT_LIST: 'cat:list',
  CAT_NEW: 'cat:new',
  CAT_TYPE_PREFIX: 'cat:type:',
  REC_NEW_PREFIX: 'rec:new:',
  REC_TYPE_PREFIX: 'rec:type:',
  REC_CAT_PREFIX: 'rec:cat:',
  REC_CAT_CREATE: 'rec:cat_create',
  REC_CONFIRM: 'rec:confirm',
  REC_CHANGE_CAT: 'rec:cats',
  FLOW_CANCEL: 'flow:cancel',
} as const;

export const SHORT_GREETINGS: ReadonlySet<string> = new Set([
  'hola',
  'buenas',
  'buenos dias',
  'buenas tardes',
  'buenas noches',
  'hey',
  'hi',
  'menu',
  'menú',
]);
