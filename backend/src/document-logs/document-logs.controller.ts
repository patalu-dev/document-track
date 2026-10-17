import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DocumentLogsService } from './document-logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PoliciesGuard } from '../ability/policies.guard';
import { CheckPolicies } from '../ability/check-policies.decorator';

@UseGuards(JwtAuthGuard)
@Controller('document-logs')
export class DocumentLogsController {
  constructor(private readonly documentLogsService: DocumentLogsService) {}

  @Get()
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'read', subject: 'DocumentLog' })
  findAll(
    @Query()
    query: {
      documentId?: number;
      action?: string;
      keyword?: string;
      order?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    },
  ) {
    return this.documentLogsService.findAll(query);
  }
}
