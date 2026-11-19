import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { CategoriesService } from '../categories/categories.service';
import { CategoryTypeValue } from '../categories/categories.types';
import { ConversationService } from '../conversation/conversation.service';
import { TelegramMiddleware } from './telegram.middleware';
import {
  buildCancelKeyboard,
  buildCategoriesListKeyboard,
  buildCategoryTypeKeyboard,
  buildMainMenuKeyboard,
  buildMainMenuText,
  formatGroupedCategories,
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

    this.bot.action(/^rec:soon:(gasto|ingreso|ahorro)$/, async (ctx) => {
      const user = await this.requireCallbackUser(ctx);
      if (!user) {
        return;
      }
      const type = ctx.match[1] as CategoryTypeValue;
      await ctx.answerCbQuery('Próximamente disponible');
      await this.safeEditOrReply(
        ctx,
        `🚧 El registro de ${type}s estará disponible en la siguiente fase.\n\nPor ahora puedes gestionar tus categorías desde el menú:`,
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

  private registerMessageHandlers(): void {
    this.bot.on('text', async (ctx) => {
      const user = getAuthenticatedUser(ctx);
      if (!user) {
        return;
      }

      const rawText = ctx.message.text.trim();
      const active = await this.conversationService.getActiveState(user.id);

      if (active.state?.pendingAction === 'awaiting_category_name') {
        if (rawText.startsWith('/')) {
          await this.conversationService.clearState(user.id);
          await ctx.reply(
            buildMainMenuText(user.name),
            buildMainMenuKeyboard(),
          );
          return;
        }

        const categoryType = active.state.pendingData?.type;
        if (!categoryType) {
          await this.conversationService.clearState(user.id);
          await ctx.reply(
            buildMainMenuText(user.name),
            buildMainMenuKeyboard(),
          );
          return;
        }

        await this.handleCategoryNameInput(ctx, user, rawText, categoryType);
        return;
      }

      if (this.isShortGreeting(rawText)) {
        await ctx.reply(buildMainMenuText(user.name), buildMainMenuKeyboard());
        return;
      }

      await ctx.reply(
        `¡Hola, ${user.name}! Por ahora puedo ayudarte desde este menú 👇`,
        buildMainMenuKeyboard(),
      );
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
