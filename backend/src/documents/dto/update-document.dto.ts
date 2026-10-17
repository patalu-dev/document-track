import { PartialType } from '@nestjs/mapped-types';
import { CreateDocumentDto } from './create-document.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { TrangThaiChungTu } from '../entities/document.entity';

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {
  @IsOptional()
  @IsEnum(TrangThaiChungTu, { message: 'Trạng thái: luu_kho | dang_muon' })
  trangThai?: TrangThaiChungTu;
}
