import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { ConversationModule } from '../conversation/conversation.module';
import { UsersModule } from '../users/users.module';
import { TelegramMiddleware } from './telegram.middleware';
import { TelegramService } from './telegram.service';

@Module({
  imports: [UsersModule, ConversationModule, CategoriesModule],
  providers: [TelegramService, TelegramMiddleware],
})
export class TelegramModule {}
