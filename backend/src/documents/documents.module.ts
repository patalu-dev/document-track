import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { Document } from './entities/document.entity';
import { Department } from '../departments/entities/department.entity';
import { AbilityModule } from '../ability/ability.module';
import { DocumentLogsModule } from '../document-logs/document-logs.module';

@Module({
  imports: [TypeOrmModule.forFeature([Document, Department]), AbilityModule, DocumentLogsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
