import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Telegraf } from 'telegraf';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN environment variable is not defined');
    }
    this.bot = new Telegraf(token);
  }

  onModuleInit() {
    this.bot.start((ctx) => ctx.reply('Hola, soy Eira'));
    void this.bot.launch();
    this.logger.log('✅ Bot de Telegram iniciado');
  }
}
