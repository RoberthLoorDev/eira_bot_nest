import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { AiService } from '../ai/ai.service';
import { CategoriesService } from '../categories/categories.service';
import {
  CategoryItem,
  CategoryTypeValue,
} from '../categories/categories.types';
import { parsePositiveAmount } from '../common/amount.util';
import { parseLocalDateToUtc } from '../common/datetime.util';
import { ConversationService } from '../conversation/conversation.service';
import { RecordDraftPendingData } from '../conversation/conversation.types';
import { RecordsService } from '../records/records.service';
import { TelegramMiddleware } from './telegram.middleware';
import {
  buildCancelKeyboard,
  buildCategoriesListKeyboard,
  buildCategoryTypeKeyboard,
  buildMainMenuKeyboard,
  buildMainMenuText,
  buildRecordCategoryPickerKeyboard,
  buildRecordConfirmKeyboard,
  buildRecordTypeKeyboard,
  formatGroupedCategories,
  formatRecordDraftCard,
  formatSavedRecordSummary,
} from './telegram.menu';
import {
  AuthenticatedUser,
  BotContext,
  CALLBACK_DATA,
  getAuthenticatedUser,
  InlineKeyboardReplyExtra,
  SHORT_GREETINGS,
} from './telegram.types';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private readonly bot: Telegraf<BotContext>;

  constructor(
    private readonly middleware: TelegramMiddleware,
    private readonly conversationService: ConversationService,
    private readonly categoriesService: CategoriesService,
    private readonly recordsService: RecordsService,
    private readonly aiService: AiService,
  ) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN environment variable is not defined');
    }
    this.bot = new Telegraf<BotContext>(token);
  }

  onModuleInit(): void {
    this.bot.use((ctx, next) => this.middleware.handle(ctx, next));
    this.registerCommands();
    this.registerActions();
    this.registerMessageHandlers();
    void this.bot.launch();
    this.logger.log('✅ Bot de Telegram iniciado');
  }

  private registerCommands(): void {
    this.bot.start((ctx) => this.sendMainMenu(ctx));
    this.bot.command('menu', (ctx) => this.sendMainMenu(ctx));
    this.bot.command('cancel', async (ctx) => {
      const user = getAuthenticatedUser(ctx);
      if (!user) {
        return;
      }
      await this.conversationService.clearState(user.id);
      await ctx.reply(
        `Operación cancelada.\n\n${buildMainMenuText(user.name)}`,
        buildMainMenuKeyboard(),
      );
    });
  }

  private registerActions(): void {
    this.registerMenuAndCategoryActions();
    this.registerRecordActions();

    this.bot.action(CALLBACK_DATA.FLOW_CANCEL, async (ctx) => {
      const user = await this.requireCallbackUser(ctx);
      if (!user) {
        return;
      }
      const active = await this.conversationService.getActiveState(user.id);
      await this.conversationService.clearState(user.id);

      const cbText = active.expired
        ? 'Tu sesión anterior ya había expirado'
        : 'Cancelado';
      await ctx.answerCbQuery(cbText);
      await this.safeEditOrReply(
        ctx,
        buildMainMenuText(user.name),
        buildMainMenuKeyboard(),
      );
    });

    this.bot.on('callback_query', async (ctx) => {
      const user = await this.requireCallbackUser(ctx);
      if (!user) {
        return;
      }
      await ctx.answerCbQuery('Esta opción ya expiró. Te muestro el menú.');
      await ctx.reply(buildMainMenuText(user.name), buildMainMenuKeyboard());
    });
  }

  private registerMenuAndCategoryActions(): void {
    this.bot.action(CALLBACK_DATA.MENU_MAIN, async (ctx) => {
      const user = await this.requireCallbackUser(ctx);
      if (!user) {
        return;
      }
      await this.conversationService.clearState(user.id);
      await ctx.answerCbQuery();
      await this.safeEditOrReply(
        ctx,
        buildMainMenuText(user.name),
        buildMainMenuKeyboard(),
      );
    });

    this.bot.action(CALLBACK_DATA.CAT_LIST, async (ctx) => {
      const user = await this.requireCallbackUser(ctx);
      if (!user) {
        return;
      }
      await ctx.answerCbQuery();
      const grouped = await this.categoriesService.listGroupedByUser(user.id);
      await this.safeEditOrReply(
        ctx,
        formatGroupedCategories(grouped),
        buildCategoriesListKeyboard(),
      );
    });

    this.bot.action(CALLBACK_DATA.CAT_NEW, async (ctx) => {
      const user = await this.requireCallbackUser(ctx);
      if (!user) {
        return;
      }
      await ctx.answerCbQuery();
      await this.safeEditOrReply(
        ctx,
        '¿Qué tipo de categoría deseas crear?',
        buildCategoryTypeKeyboard(),
      );
    });

    this.bot.action(/^cat:type:(gasto|ingreso|ahorro)$/, async (ctx) => {
      const user = await this.requireCallbackUser(ctx);
      if (!user) {
        return;
      }
      const selectedType = ctx.match[1] as CategoryTypeValue;
      const promptMsg = `Perfecto. Escribe el nombre para tu nueva categoría de ${selectedType} (ej: Comida, Transporte):`;

      await this.conversationService.setState({
        userId: user.id,
        pendingAction: 'awaiting_category_name',
        pendingData: { type: selectedType },
        lastBotMsg: promptMsg,
      });

      await ctx.answerCbQuery();
      await this.safeEditOrReply(ctx, promptMsg, buildCancelKeyboard());
    });
  }

  private registerRecordActions(): void {
    this.bot.action(/^rec:new:(gasto|ingreso|ahorro)$/, async (ctx) => {
      const user = await this.requireCallbackUser(ctx);
      if (!user) {
        return;
      }
      const selectedType = ctx.match[1] as CategoryTypeValue;
      const promptMsg = `Cuéntame tu ${selectedType} (ej: "15.50 en almuerzo hoy" o "25 mando PS5 en Navidad"):`;

      await this.conversationService.setState({
        userId: user.id,
        pendingAction: 'awaiting_record_input',
        pendingData: { type: selectedType },
        lastBotMsg: promptMsg,
      });

      await ctx.answerCbQuery();
      await this.safeEditOrReply(ctx, promptMsg, buildCancelKeyboard());
    });

    this.bot.action(/^rec:type:(gasto|ingreso|ahorro)$/, async (ctx) => {
      const user = await this.requireCallbackUser(ctx);
      if (!user) {
        return;
      }
      const active = await this.conversationService.getActiveState(user.id);
      if (
        active.state?.pendingAction !== 'awaiting_record_type' ||
        !active.state.pendingData
      ) {
        await ctx.answerCbQuery('Tu sesión expiró. Intenta de nuevo.');
        await this.safeEditOrReply(
          ctx,
          buildMainMenuText(user.name),
          buildMainMenuKeyboard(),
        );
        return;
      }

      const selectedType = ctx.match[1] as CategoryTypeValue;
      await ctx.answerCbQuery();
      await this.advanceRecordDraft(
        ctx,
        user,
        { ...active.state.pendingData, type: selectedType },
        true,
      );
    });

    this.bot.action(CALLBACK_DATA.REC_CHANGE_CAT, async (ctx) => {
      const user = await this.requireCallbackUser(ctx);
      if (!user) {
        return;
      }
      const active = await this.conversationService.getActiveState(user.id);
      const draft = active.state?.pendingData;
      if (
        active.state?.pendingAction !== 'confirm_create_record' ||
        !draft?.type
      ) {
        await ctx.answerCbQuery('Tu sesión expiró. Intenta de nuevo.');
        await this.safeEditOrReply(
          ctx,
          buildMainMenuText(user.name),
          buildMainMenuKeyboard(),
        );
        return;
      }

      const categories = await this.categoriesService.listByUserAndType(
        user.id,
        draft.type,
      );
      await this.conversationService.setState({
        userId: user.id,
        pendingAction: 'awaiting_record_category',
        pendingData: draft,
      });
      await ctx.answerCbQuery();
      await this.safeEditOrReply(
        ctx,
        `Elige una categoría de ${draft.type}:`,
        buildRecordCategoryPickerKeyboard(categories),
      );
    });

    this.bot.action(/^rec:cat:([0-9a-fA-F-]+)$/, async (ctx) => {
      const user = await this.requireCallbackUser(ctx);
      if (!user) {
        return;
      }
      const active = await this.conversationService.getActiveState(user.id);
      const draft = active.state?.pendingData;
      if (
        active.state?.pendingAction !== 'awaiting_record_category' ||
        !draft
      ) {
        await ctx.answerCbQuery('Tu sesión expiró. Intenta de nuevo.');
        await this.safeEditOrReply(
          ctx,
          buildMainMenuText(user.name),
          buildMainMenuKeyboard(),
        );
        return;
      }

      const categoryId = ctx.match[1];
      const category = await this.categoriesService.findActiveById(
        user.id,
        categoryId,
      );
      if (!category) {
        await ctx.answerCbQuery('Categoría no encontrada.');
        return;
      }

      await ctx.answerCbQuery();
      await this.advanceRecordDraft(
        ctx,
        user,
        {
          ...draft,
          type: category.type,
          categoryId: category.id,
          categoryName: category.name,
          suggestedCategoryName: undefined,
        },
        true,
      );
    });

    this.bot.action(CALLBACK_DATA.REC_CAT_CREATE, async (ctx) => {
      const user = await this.requireCallbackUser(ctx);
      if (!user) {
        return;
      }
      const active = await this.conversationService.getActiveState(user.id);
      const draft = active.state?.pendingData;
      if (
        active.state?.pendingAction !== 'awaiting_record_category' ||
        !draft?.type ||
        !draft.suggestedCategoryName
      ) {
        await ctx.answerCbQuery('Tu sesión expiró. Intenta de nuevo.');
        await this.safeEditOrReply(
          ctx,
          buildMainMenuText(user.name),
          buildMainMenuKeyboard(),
        );
        return;
      }

      const created = await this.categoriesService.createForUser({
        userId: user.id,
        name: draft.suggestedCategoryName,
        type: draft.type,
      });

      if (!created.ok) {
        await ctx.answerCbQuery('No se pudo crear la categoría.');
        return;
      }

      await ctx.answerCbQuery(`Categoría "${created.category.name}" creada`);
      await this.advanceRecordDraft(
        ctx,
        user,
        {
          ...draft,
          categoryId: created.category.id,
          categoryName: created.category.name,
          suggestedCategoryName: undefined,
        },
        true,
      );
    });

    this.bot.action(CALLBACK_DATA.REC_CONFIRM, async (ctx) => {
      const user = await this.requireCallbackUser(ctx);
      if (!user) {
        return;
      }
      const active = await this.conversationService.getActiveState(user.id);
      const draft = active.state?.pendingData;
      if (
        active.state?.pendingAction !== 'confirm_create_record' ||
        !draft?.categoryId ||
        draft.amount === undefined ||
        !draft.description
      ) {
        await this.conversationService.clearState(user.id);
        await ctx.answerCbQuery('Tu sesión expiró. Intenta de nuevo.');
        await this.safeEditOrReply(
          ctx,
          buildMainMenuText(user.name),
          buildMainMenuKeyboard(),
        );
        return;
      }

      const occurredAt = draft.occurredAtIso
        ? new Date(draft.occurredAtIso)
        : new Date();

      const saved = await this.recordsService.createForUser({
        userId: user.id,
        categoryId: draft.categoryId,
        amount: draft.amount,
        description: draft.description,
        occurredAt,
      });

      await this.conversationService.clearState(user.id);

      if (!saved.ok) {
        await ctx.answerCbQuery('Datos inválidos');
        await this.safeEditOrReply(
          ctx,
          'No pude guardar ese movimiento. Revisa el monto o la descripción e intenta de nuevo.',
          buildMainMenuKeyboard(),
        );
        return;
      }

      await ctx.answerCbQuery('¡Movimiento guardado!');
      await this.safeEditOrReply(
        ctx,
        `✅ Guardado: $${saved.record.amount} · ${saved.record.description} (${draft.categoryName ?? 'Categoría'})\n\n¿Qué deseas hacer ahora?`,
        buildMainMenuKeyboard(),
      );
    });
  }

  private registerMessageHandlers(): void {
    this.bot.on('text', async (ctx) => {
      const user = getAuthenticatedUser(ctx);
      if (!user) {
        return;
      }

      const rawText = ctx.message.text.trim();
      const active = await this.conversationService.getActiveState(user.id);

      if (active.state && rawText.startsWith('/')) {
        await this.conversationService.clearState(user.id);
        await ctx.reply(buildMainMenuText(user.name), buildMainMenuKeyboard());
        return;
      }

      if (active.state?.pendingAction === 'awaiting_category_name') {
        const categoryType = active.state.pendingData?.type;
        if (!categoryType) {
          await this.sendMainMenu(ctx);
          return;
        }
        await this.handleCategoryNameInput(ctx, user, rawText, categoryType);
        return;
      }

      if (active.state?.pendingAction === 'awaiting_record_input') {
        const forcedType = active.state.pendingData?.type;
        await this.handleRecordTextExtraction(ctx, user, rawText, forcedType);
        return;
      }

      if (active.state?.pendingAction === 'awaiting_record_amount') {
        await this.handleMissingAmountInput(
          ctx,
          user,
          rawText,
          active.state.pendingData ?? {},
        );
        return;
      }

      if (this.isShortGreeting(rawText)) {
        await ctx.reply(buildMainMenuText(user.name), buildMainMenuKeyboard());
        return;
      }

      await this.handleRecordTextExtraction(ctx, user, rawText);
    });

    this.bot.on('message', async (ctx) => {
      const user = getAuthenticatedUser(ctx);
      if (!user) {
        return;
      }

      const active = await this.conversationService.getActiveState(user.id);
      if (active.state?.pendingAction === 'awaiting_category_name') {
        await ctx.reply(
          'Por favor, envíame un nombre válido en texto (máx. 100 caracteres):',
          buildCancelKeyboard(),
        );
        return;
      }

      await ctx.reply(
        'Por ahora solo proceso mensajes de texto o botones del menú 👇',
        buildMainMenuKeyboard(),
      );
    });
  }

  private async handleRecordTextExtraction(
    ctx: BotContext,
    user: AuthenticatedUser,
    rawText: string,
    forcedType?: CategoryTypeValue,
  ): Promise<void> {
    const categories = await this.categoriesService.listActiveByUser(user.id);
    const nowUtc = new Date();

    const extraction = await this.aiService.extractRecord({
      text: rawText,
      categories,
      userTimezone: user.timezone,
      nowUtc,
      forcedType,
    });

    if (!extraction.ok) {
      await ctx.reply(
        'Tuve un problema temporal con la IA para leer ese mensaje. Intenta de nuevo en unos segundos o usa el menú 👇',
        buildMainMenuKeyboard(),
      );
      return;
    }

    if (extraction.data.intent === 'unknown' && !forcedType) {
      await ctx.reply(
        `¡Hola, ${user.name}! Cuéntame un gasto, ingreso o ahorro (ej: "gasté $12 en almuerzo"), o usa el menú 👇`,
        buildMainMenuKeyboard(),
      );
      return;
    }

    const occurredAt = parseLocalDateToUtc(
      extraction.data.occurredAtDate,
      user.timezone,
      nowUtc,
    );

    const draft: RecordDraftPendingData = {
      type: forcedType ?? extraction.data.type ?? undefined,
      amount: extraction.data.amount ?? undefined,
      description: extraction.data.description ?? rawText.slice(0, 120),
      suggestedCategoryName: extraction.data.categoryName ?? undefined,
      occurredAtIso: occurredAt.toISOString(),
    };

    await this.advanceRecordDraft(ctx, user, draft, false, true);
  }

  private async handleMissingAmountInput(
    ctx: BotContext,
    user: AuthenticatedUser,
    rawText: string,
    draft: RecordDraftPendingData,
  ): Promise<void> {
    const amount = parsePositiveAmount(rawText);
    if (amount === null) {
      await ctx.reply(
        'Envíame un monto válido mayor a 0 (ej: 15, 0.25 o "25 centavos"):',
        buildCancelKeyboard(),
      );
      return;
    }

    await this.advanceRecordDraft(ctx, user, { ...draft, amount }, false);
  }

  private async advanceRecordDraft(
    ctx: BotContext,
    user: AuthenticatedUser,
    draft: RecordDraftPendingData,
    editMessage: boolean,
    autoSaveIfComplete = false,
  ): Promise<void> {
    if (!draft.type) {
      await this.conversationService.setState({
        userId: user.id,
        pendingAction: 'awaiting_record_type',
        pendingData: draft,
      });
      await this.sendOrEdit(
        ctx,
        '¿Este movimiento es un gasto, ingreso o ahorro?',
        buildRecordTypeKeyboard(),
        editMessage,
      );
      return;
    }

    if (draft.amount === undefined || draft.amount <= 0) {
      await this.conversationService.setState({
        userId: user.id,
        pendingAction: 'awaiting_record_amount',
        pendingData: draft,
      });
      await this.sendOrEdit(
        ctx,
        '¿Cuánto fue el monto? (ej: 15.50, 0.25 o "25 centavos")',
        buildCancelKeyboard(),
        editMessage,
      );
      return;
    }

    const resolved = await this.resolveDraftCategory(user.id, draft);
    if (!resolved.categoryId) {
      await this.conversationService.setState({
        userId: user.id,
        pendingAction: 'awaiting_record_category',
        pendingData: resolved.updatedDraft,
      });
      const prompt = resolved.updatedDraft.suggestedCategoryName
        ? `No encontré la categoría "${resolved.updatedDraft.suggestedCategoryName}" en ${draft.type}. Elige una de tus categorías o créala:`
        : `¿En qué categoría de ${draft.type} lo guardo?`;

      await this.sendOrEdit(
        ctx,
        prompt,
        buildRecordCategoryPickerKeyboard(
          resolved.typeCategories,
          resolved.updatedDraft.suggestedCategoryName,
        ),
        editMessage,
      );
      return;
    }

    if (autoSaveIfComplete && resolved.updatedDraft.description) {
      await this.saveDraftDirectly(
        ctx,
        user,
        resolved.updatedDraft,
        editMessage,
      );
      return;
    }

    await this.conversationService.setState({
      userId: user.id,
      pendingAction: 'confirm_create_record',
      pendingData: resolved.updatedDraft,
    });
    await this.sendOrEdit(
      ctx,
      formatRecordDraftCard(resolved.updatedDraft, user.timezone),
      buildRecordConfirmKeyboard(),
      editMessage,
    );
  }

  private async saveDraftDirectly(
    ctx: BotContext,
    user: AuthenticatedUser,
    draft: RecordDraftPendingData,
    editMessage: boolean,
  ): Promise<void> {
    if (!draft.categoryId || draft.amount === undefined || !draft.description) {
      return;
    }

    const occurredAt = draft.occurredAtIso
      ? new Date(draft.occurredAtIso)
      : new Date();

    const saved = await this.recordsService.createForUser({
      userId: user.id,
      categoryId: draft.categoryId,
      amount: draft.amount,
      description: draft.description,
      occurredAt,
    });

    await this.conversationService.clearState(user.id);

    if (!saved.ok) {
      await this.sendOrEdit(
        ctx,
        'No pude guardar ese movimiento. Revisa el monto o la descripción e intenta de nuevo.',
        buildMainMenuKeyboard(),
        editMessage,
      );
      return;
    }

    const summary = formatSavedRecordSummary(
      draft,
      saved.record.amount,
      saved.record.description,
      saved.record.occurredAt,
      user.timezone,
    );

    await this.sendOrEdit(
      ctx,
      `${summary}\n\n¿Qué deseas hacer ahora?`,
      buildMainMenuKeyboard(),
      editMessage,
    );
  }

  private async resolveDraftCategory(
    userId: string,
    draft: RecordDraftPendingData,
  ): Promise<{
    categoryId?: string;
    updatedDraft: RecordDraftPendingData;
    typeCategories: CategoryItem[];
  }> {
    const type = draft.type ?? 'gasto';
    const typeCategories = await this.categoriesService.listByUserAndType(
      userId,
      type,
    );

    if (draft.categoryId) {
      return {
        categoryId: draft.categoryId,
        updatedDraft: draft,
        typeCategories,
      };
    }

    const suggested = draft.suggestedCategoryName?.trim().toLowerCase();
    if (suggested) {
      const matched = typeCategories.find(
        (cat) => cat.name.toLowerCase() === suggested,
      );
      if (matched) {
        return {
          categoryId: matched.id,
          updatedDraft: {
            ...draft,
            categoryId: matched.id,
            categoryName: matched.name,
            suggestedCategoryName: undefined,
          },
          typeCategories,
        };
      }
    }

    return { updatedDraft: draft, typeCategories };
  }

  private async handleCategoryNameInput(
    ctx: BotContext,
    user: AuthenticatedUser,
    rawText: string,
    categoryType: CategoryTypeValue,
  ): Promise<void> {
    const result = await this.categoriesService.createForUser({
      userId: user.id,
      name: rawText,
      type: categoryType,
    });

    if (!result.ok) {
      if (result.reason === 'invalid_name') {
        await ctx.reply(
          'Por favor, envíame un nombre válido en texto (máx. 100 caracteres):',
          buildCancelKeyboard(),
        );
        return;
      }

      if (result.reason === 'name_too_long') {
        await ctx.reply(
          'El nombre es demasiado largo (máximo 100 caracteres). Escribe un nombre más corto:',
          buildCancelKeyboard(),
        );
        return;
      }

      await ctx.reply(
        `Ya tienes una categoría llamada "${rawText}". Escribe otro nombre:`,
        buildCancelKeyboard(),
      );
      return;
    }

    await this.conversationService.clearState(user.id);
    await ctx.reply(
      `✅ Categoría "${result.category.name}" (${result.category.type}) creada correctamente.\n\n¿Qué deseas hacer ahora?`,
      buildMainMenuKeyboard(),
    );
  }

  private async sendMainMenu(ctx: BotContext): Promise<void> {
    const user = getAuthenticatedUser(ctx);
    if (!user) {
      return;
    }
    await this.conversationService.clearState(user.id);
    await ctx.reply(buildMainMenuText(user.name), buildMainMenuKeyboard());
  }

  private async requireCallbackUser(
    ctx: BotContext,
  ): Promise<AuthenticatedUser | null> {
    const user = getAuthenticatedUser(ctx);
    if (!user) {
      await ctx.answerCbQuery();
      return null;
    }
    return user;
  }

  private async sendOrEdit(
    ctx: BotContext,
    text: string,
    extra: InlineKeyboardReplyExtra,
    editMessage: boolean,
  ): Promise<void> {
    if (editMessage) {
      await this.safeEditOrReply(ctx, text, extra);
      return;
    }
    await ctx.reply(text, extra);
  }

  private async safeEditOrReply(
    ctx: BotContext,
    text: string,
    extra: InlineKeyboardReplyExtra,
  ): Promise<void> {
    try {
      await ctx.editMessageText(text, extra);
    } catch {
      await ctx.reply(text, extra);
    }
  }

  private isShortGreeting(text: string): boolean {
    const normalized = text
      .toLowerCase()
      .replace(/[!?.¡¿,]+$/g, '')
      .trim();
    return SHORT_GREETINGS.has(normalized);
  }
}
