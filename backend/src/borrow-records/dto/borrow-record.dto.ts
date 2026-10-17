import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { sanitizeInput } from '../../utils/sanitize';

export class BorrowDocumentDto {
  @Type(() => Number)
  @IsInt({ message: 'documentId không hợp lệ' })
  @Min(1)
  documentId: number;

  @IsString({ message: 'Người mượn không được để trống' })
  @MaxLength(100)
  @Transform(({ value }) => sanitizeInput(value?.trim?.() ?? value))
  nguoiMuon: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (value ? sanitizeInput(value?.trim?.() ?? value) : value))
  donViMuon?: string | null;

  @IsDateString({}, { message: 'Ngày mượn không hợp lệ (YYYY-MM-DD)' })
  ngayMuon: string;

  @IsDateString({}, { message: 'Hạn trả không hợp lệ (YYYY-MM-DD)' })
  hanTra: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }) => (value ? sanitizeInput(value) : value))
  ghiChu?: string | null;
}

export class ReturnDocumentDto {
  @IsOptional()
  @IsDateString({}, { message: 'Ngày trả không hợp lệ (YYYY-MM-DD)' })
  ngayTraThucTe?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }) => (value ? sanitizeInput(value) : value))
  ghiChu?: string | null;
}
