import {
  CategoryItem,
  CategoryTypeValue,
  GroupedCategories,
} from '../categories/categories.types';
import { formatUtcForUser } from '../common/datetime.util';
import { RecordDraftPendingData } from '../conversation/conversation.types';
import {
  CALLBACK_DATA,
  InlineButtonItem,
  InlineKeyboardReplyExtra,
} from './telegram.types';

const TYPE_LABELS: Record<CategoryTypeValue, string> = {
  gasto: '💸 Gastos',
  ingreso: '💰 Ingresos',
  ahorro: '🐷 Ahorros',
};

const SINGLE_TYPE_LABELS: Record<CategoryTypeValue, string> = {
  gasto: '💸 Gasto',
  ingreso: '💰 Ingreso',
  ahorro: '🐷 Ahorro',
};

function callbackButton(text: string, callbackData: string): InlineButtonItem {
  return { text, callback_data: callbackData };
}

export function buildMainMenuText(userName: string): string {
  return `¡Hola, ${userName}! 👋\n\n¿Qué deseas hacer hoy?`;
}

export function buildMainMenuKeyboard(): InlineKeyboardReplyExtra {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          callbackButton(
            '💸 Registrar gasto',
            `${CALLBACK_DATA.REC_NEW_PREFIX}gasto`,
          ),
          callbackButton(
            '💰 Registrar ingreso',
            `${CALLBACK_DATA.REC_NEW_PREFIX}ingreso`,
          ),
        ],
        [
          callbackButton(
            '🐷 Registrar ahorro',
            `${CALLBACK_DATA.REC_NEW_PREFIX}ahorro`,
          ),
        ],
        [
          callbackButton('📂 Mis categorías', CALLBACK_DATA.CAT_LIST),
          callbackButton('➕ Nueva categoría', CALLBACK_DATA.CAT_NEW),
        ],
      ],
    },
  };
}

export function buildCategoryTypeKeyboard(): InlineKeyboardReplyExtra {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          callbackButton('💸 Gasto', `${CALLBACK_DATA.CAT_TYPE_PREFIX}gasto`),
          callbackButton(
            '💰 Ingreso',
            `${CALLBACK_DATA.CAT_TYPE_PREFIX}ingreso`,
          ),
          callbackButton('🐷 Ahorro', `${CALLBACK_DATA.CAT_TYPE_PREFIX}ahorro`),
        ],
        [callbackButton('❌ Cancelar', CALLBACK_DATA.FLOW_CANCEL)],
      ],
    },
  };
}

export function buildRecordTypeKeyboard(): InlineKeyboardReplyExtra {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          callbackButton('💸 Gasto', `${CALLBACK_DATA.REC_TYPE_PREFIX}gasto`),
          callbackButton(
            '💰 Ingreso',
            `${CALLBACK_DATA.REC_TYPE_PREFIX}ingreso`,
          ),
          callbackButton('🐷 Ahorro', `${CALLBACK_DATA.REC_TYPE_PREFIX}ahorro`),
        ],
        [callbackButton('❌ Cancelar', CALLBACK_DATA.FLOW_CANCEL)],
      ],
    },
  };
}

export function buildRecordCategoryPickerKeyboard(
  categories: CategoryItem[],
  suggestedName?: string,
): InlineKeyboardReplyExtra {
  const rows: InlineButtonItem[][] = [];

  for (let i = 0; i < categories.length; i += 2) {
    const pair = categories.slice(i, i + 2).map((cat) => {
      const label = cat.emoji ? `${cat.emoji} ${cat.name}` : cat.name;
      return callbackButton(label, `${CALLBACK_DATA.REC_CAT_PREFIX}${cat.id}`);
    });
    rows.push(pair);
  }

  if (suggestedName) {
    const shortName =
      suggestedName.length > 24
        ? `${suggestedName.slice(0, 21)}...`
        : suggestedName;
    rows.push([
      callbackButton(`➕ Crear "${shortName}"`, CALLBACK_DATA.REC_CAT_CREATE),
    ]);
  }

  rows.push([callbackButton('❌ Cancelar', CALLBACK_DATA.FLOW_CANCEL)]);

  return { reply_markup: { inline_keyboard: rows } };
}

export function buildRecordConfirmKeyboard(): InlineKeyboardReplyExtra {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          callbackButton('✅ Guardar', CALLBACK_DATA.REC_CONFIRM),
          callbackButton('🏷️ Cambiar categoría', CALLBACK_DATA.REC_CHANGE_CAT),
        ],
        [callbackButton('❌ Cancelar', CALLBACK_DATA.FLOW_CANCEL)],
      ],
    },
  };
}

export function buildCancelKeyboard(): InlineKeyboardReplyExtra {
  return {
    reply_markup: {
      inline_keyboard: [
        [callbackButton('❌ Cancelar', CALLBACK_DATA.FLOW_CANCEL)],
      ],
    },
  };
}

export function buildCategoriesListKeyboard(): InlineKeyboardReplyExtra {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          callbackButton('➕ Nueva categoría', CALLBACK_DATA.CAT_NEW),
          callbackButton('⬅️ Volver al menú', CALLBACK_DATA.MENU_MAIN),
        ],
      ],
    },
  };
}

export function formatRecordDraftCard(
  draft: RecordDraftPendingData,
  timezone: string,
): string {
  const typeLabel = draft.type ? SINGLE_TYPE_LABELS[draft.type] : 'Movimiento';
  const amountText =
    draft.amount !== undefined ? `$${draft.amount.toFixed(2)}` : 'Sin monto';
  const description = draft.description ?? 'Sin descripción';
  const category = draft.categoryName ?? 'Sin categoría';
  const occurredAt = draft.occurredAtIso
    ? new Date(draft.occurredAtIso)
    : new Date();
  const dateText = formatUtcForUser(occurredAt, timezone);

  return [
    '📝 Revisa tu movimiento:',
    '',
    `• Tipo: ${typeLabel}`,
    `• Monto: ${amountText}`,
    `• Descripción: ${description}`,
    `• Categoría: ${category}`,
    `• Fecha: ${dateText}`,
  ].join('\n');
}

export function formatSavedRecordSummary(
  draft: RecordDraftPendingData,
  savedAmount: string,
  savedDescription: string,
  occurredAt: Date,
  timezone: string,
): string {
  const typeLabel = draft.type ? SINGLE_TYPE_LABELS[draft.type] : 'Movimiento';
  const category = draft.categoryName ?? 'Sin categoría';
  const dateText = formatUtcForUser(occurredAt, timezone);

  return [
    '✅ ¡Listo! Registré tu movimiento:',
    '',
    `• Tipo: ${typeLabel}`,
    `• Monto: $${savedAmount}`,
    `• Descripción: ${savedDescription}`,
    `• Categoría: ${category}`,
    `• Fecha: ${dateText}`,
  ].join('\n');
}

function formatCategoryLine(category: CategoryItem): string {
  const prefix = category.emoji ? `${category.emoji} ` : '• ';
  const defaultTag = category.isDefault ? ' (por defecto)' : '';
  return `${prefix}${category.name}${defaultTag}`;
}

export function formatGroupedCategories(grouped: GroupedCategories): string {
  const sections: string[] = [];
  const types: CategoryTypeValue[] = ['gasto', 'ingreso', 'ahorro'];

  for (const type of types) {
    const items = grouped[type];
    const lines =
      items.length > 0
        ? items.map(formatCategoryLine).join('\n')
        : '• Sin categorías todavía';
    sections.push(`${TYPE_LABELS[type]}\n${lines}`);
  }

  return `📂 Tus categorías activas:\n\n${sections.join('\n\n')}`;
}
