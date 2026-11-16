import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { TelegramMiddleware } from './telegram.middleware';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf;

  constructor(private readonly middleware: TelegramMiddleware) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN environment variable is not defined');
    }
    this.bot = new Telegraf(token);
  }

  onModuleInit() {
    this.bot.use((ctx, next) => this.middleware.handle(ctx, next));
    this.bot.start((ctx) => ctx.reply('¡Hola! Soy Eira 👋'));
    this.bot.on('text', async (ctx) => {
      await ctx.reply(
        `Recibí tu mensaje: "${ctx.message.text}".\n(Por ahora solo está activo el registro; el módulo de IA/registros aún falta por implementar).`,
      );
    });
    void this.bot.launch();
    this.logger.log('✅ Bot de Telegram iniciado');
  }
}
