import { Module, Global } from '@nestjs/common';
import { LLMService } from './services/llm.service';

@Global()
@Module({
  providers: [LLMService],
  exports: [LLMService],
})
export class CommonModule {}
