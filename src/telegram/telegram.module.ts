import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { UsersModule } from 'src/users/users.module';
import { TelegramMiddleware } from './telegram.middleware';

@Module({
  imports: [UsersModule],
  providers: [TelegramService, TelegramMiddleware],
})
export class TelegramModule {}
