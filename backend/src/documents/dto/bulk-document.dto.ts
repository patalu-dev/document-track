import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMaxSize,
  ValidateNested,
  IsString,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { CreateDocumentDto } from './create-document.dto';
import { Transform } from 'class-transformer';
import { sanitizeInput } from '../../utils/sanitize';

export class BulkCreateDocumentDto {
  @IsArray({ message: 'items phải là mảng chứng từ' })
  @ArrayMaxSize(500, { message: 'Tối đa 500 chứng từ / lần import' })
  @ValidateNested({ each: true })
  @Type(() => CreateDocumentDto)
  items: CreateDocumentDto[];
}

export class ChangeLocationDto {
  @IsString({ message: 'Vị trí mới không được để trống' })
  @MaxLength(255)
  @Transform(({ value }) => sanitizeInput(value?.trim?.() ?? value))
  viTri: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }) => (value ? sanitizeInput(value) : value))
  ghiChu?: string;
}
