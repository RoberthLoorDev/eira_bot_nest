import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { Context } from 'telegraf';

@Injectable()
export class TelegramMiddleware {
  private readonly logger = new Logger(TelegramMiddleware.name);
  private pendingRegistration = new Map<number, boolean>();

  constructor(private readonly userService: UsersService) {}

  async handle(ctx: Context, next: () => Promise<void>) {
    const telegramId = ctx.from?.id;
    if (!telegramId) return next();

    if (this.pendingRegistration.get(telegramId)) {
      const text =
        ctx.message && 'text' in ctx.message ? ctx.message.text.trim() : null;

      if (!text || text.startsWith('/')) {
        await ctx.reply('Por favor, envíame tu nombre 😌');
        return;
      }

      await this.userService.create(BigInt(telegramId), text);
      this.pendingRegistration.delete(telegramId);
      await ctx.reply(`¡Listo, ${text}! Ya podemos empezar 🥳`);

      return;
    }

    const exists = await this.userService.existsByTelegramId(
      BigInt(telegramId),
    );

    if (!exists) {
      this.pendingRegistration.set(telegramId, true);
      await ctx.reply(
        '¡Hola! Soy Eira, tu asistente contable 💼\n\n¿Cómo quieres que te llame?',
      );
      return;
    }

    return next();
  }
}
