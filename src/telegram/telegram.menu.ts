import {
  CategoryItem,
  CategoryTypeValue,
  GroupedCategories,
} from '../categories/categories.types';
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
            `${CALLBACK_DATA.REC_SOON_PREFIX}gasto`,
          ),
          callbackButton(
            '💰 Registrar ingreso',
            `${CALLBACK_DATA.REC_SOON_PREFIX}ingreso`,
          ),
        ],
        [
          callbackButton(
            '🐷 Registrar ahorro',
            `${CALLBACK_DATA.REC_SOON_PREFIX}ahorro`,
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
