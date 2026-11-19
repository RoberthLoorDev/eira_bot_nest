import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { GeminiProvider } from './gemini.provider';
import { GroqProvider } from './groq.provider';

@Module({
  providers: [AiService, GroqProvider, GeminiProvider],
  exports: [AiService],
})
export class AiModule {}
