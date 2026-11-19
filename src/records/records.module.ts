import { Module } from '@nestjs/common';
import { RecordsRepository } from './records.repository';
import { RecordsService } from './records.service';

@Module({
  providers: [RecordsService, RecordsRepository],
  exports: [RecordsService],
})
export class RecordsModule {}
