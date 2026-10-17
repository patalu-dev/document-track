import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BorrowRecordsService } from './borrow-records.service';
import { BorrowRecordsController } from './borrow-records.controller';
import { BorrowRecord } from './entities/borrow-record.entity';
import { Document } from '../documents/entities/document.entity';
import { AbilityModule } from '../ability/ability.module';
import { DocumentLogsModule } from '../document-logs/document-logs.module';

@Module({
  imports: [TypeOrmModule.forFeature([BorrowRecord, Document]), AbilityModule, DocumentLogsModule],
  controllers: [BorrowRecordsController],
  providers: [BorrowRecordsService],
  exports: [BorrowRecordsService],
})
export class BorrowRecordsModule {}
