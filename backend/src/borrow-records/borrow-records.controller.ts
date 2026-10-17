import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { BorrowRecordsService } from './borrow-records.service';
import { BorrowDocumentDto, ReturnDocumentDto } from './dto/borrow-record.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PoliciesGuard } from '../ability/policies.guard';
import { CheckPolicies } from '../ability/check-policies.decorator';
import { Req } from '@nestjs/common';

@UseGuards(JwtAuthGuard)
@Controller('borrow-records')
export class BorrowRecordsController {
  constructor(private readonly borrowRecordsService: BorrowRecordsService) {}

  @Post('borrow')
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'create', subject: 'BorrowRecord' })
  borrow(@Body() dto: BorrowDocumentDto, @Req() req: any) {
    return this.borrowRecordsService.borrow(dto, req.user);
  }

  @Post(':id/return')
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'update', subject: 'BorrowRecord' })
  returnOne(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReturnDocumentDto,
    @Req() req: any,
  ) {
    return this.borrowRecordsService.returnOne(id, dto, req.user);
  }

  @Get()
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'read', subject: 'BorrowRecord' })
  findAll(
    @Query()
    query: {
      documentId?: number;
      trangThai?: string;
      keyword?: string;
      quaHan?: string;
      order?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    },
  ) {
    return this.borrowRecordsService.findAll(query);
  }

  @Get(':id')
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'read', subject: 'BorrowRecord' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.borrowRecordsService.findOne(id);
  }
}
