import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { CategoriesModule } from '../categories/categories.module';
import { ConversationModule } from '../conversation/conversation.module';
import { RecordsModule } from '../records/records.module';
import { UsersModule } from '../users/users.module';
import { TelegramMiddleware } from './telegram.middleware';
import { TelegramService } from './telegram.service';

@Module({
  imports: [
    UsersModule,
    ConversationModule,
    CategoriesModule,
    RecordsModule,
    AiModule,
  ],
  providers: [TelegramService, TelegramMiddleware],
})
export class TelegramModule {}
