import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { DocumentsService } from './documents.service';
import type { DocumentQuery } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { BulkCreateDocumentDto, ChangeLocationDto } from './dto/bulk-document.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PoliciesGuard } from '../ability/policies.guard';
import { CheckPolicies } from '../ability/check-policies.decorator';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'create', subject: 'Document' })
  create(@Body() createDocumentDto: CreateDocumentDto, @Req() req: any) {
    return this.documentsService.create(createDocumentDto, req.user);
  }

  @Post('bulk')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'import', subject: 'Document' })
  bulkCreate(@Body() dto: BulkCreateDocumentDto, @Req() req: any) {
    return this.documentsService.bulkCreate(dto, req.user);
  }

  @Get()
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'read', subject: 'Document' })
  findAll(@Query() query: DocumentQuery) {
    return this.documentsService.findAll(query);
  }

  @Get('export')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'read', subject: 'Document' })
  exportAll(@Query() query: DocumentQuery) {
    return this.documentsService.exportAll(query);
  }

  @Get('stats/overview')
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'read', subject: 'Document' })
  stats() {
    return this.documentsService.stats();
  }

  @Get(':id')
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'read', subject: 'Document' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.documentsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'update', subject: 'Document' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @Req() req: any,
  ) {
    return this.documentsService.update(id, updateDocumentDto, req.user);
  }

  @Patch(':id/location')
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'update', subject: 'Document' })
  changeLocation(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeLocationDto,
    @Req() req: any,
  ) {
    return this.documentsService.changeLocation(id, dto, req.user);
  }

  @Delete(':id')
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'delete', subject: 'Document' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.documentsService.remove(id, req.user);
  }

  @Post(':id/destroy')
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'delete', subject: 'Document' })
  destroy(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.documentsService.destroy(id, req.user);
  }
}
