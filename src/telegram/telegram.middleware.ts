import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { buildMainMenuKeyboard, buildMainMenuText } from './telegram.menu';
import { BotContext, setAuthenticatedUser } from './telegram.types';

@Injectable()
export class TelegramMiddleware {
  // Keeps in-memory flag only during first-time registration because conversation_state requires an existing user_id FK.
  private readonly pendingRegistration = new Map<number, boolean>();

  constructor(private readonly userService: UsersService) {}

  async handle(ctx: BotContext, next: () => Promise<void>): Promise<void> {
    const telegramId = ctx.from?.id;
    if (!telegramId) {
      return next();
    }

    if (this.pendingRegistration.get(telegramId)) {
      const text =
        ctx.message && 'text' in ctx.message ? ctx.message.text.trim() : null;

      if (!text || text.startsWith('/')) {
        if (ctx.callbackQuery) {
          await ctx.answerCbQuery();
        }
        await ctx.reply('Por favor, envíame tu nombre 😌');
        return;
      }

      const newUser = await this.userService.create(BigInt(telegramId), text);
      this.pendingRegistration.delete(telegramId);
      setAuthenticatedUser(ctx, {
        id: newUser.id,
        telegramId: newUser.telegramId,
        name: newUser.name,
      });

      await ctx.reply(
        `¡Listo, ${newUser.name}! Ya podemos empezar 🥳\n\n${buildMainMenuText(newUser.name)}`,
        buildMainMenuKeyboard(),
      );
      return;
    }

    const user = await this.userService.findByTelegramId(BigInt(telegramId));

    if (!user) {
      if (ctx.callbackQuery) {
        await ctx.answerCbQuery();
      }
      this.pendingRegistration.set(telegramId, true);
      await ctx.reply(
        '¡Hola! Soy Eira, tu asistente contable 💼\n\n¿Cómo quieres que te llame?',
      );
      return;
    }

    setAuthenticatedUser(ctx, {
      id: user.id,
      telegramId: user.telegramId,
      name: user.name,
    });

    return next();
  }
}
