import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentLogsService } from './document-logs.service';
import { DocumentLogsController } from './document-logs.controller';
import { DocumentLog } from './entities/document-log.entity';
import { AbilityModule } from '../ability/ability.module';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentLog]), AbilityModule],
  controllers: [DocumentLogsController],
  providers: [DocumentLogsService],
  exports: [DocumentLogsService],
})
export class DocumentLogsModule {}
