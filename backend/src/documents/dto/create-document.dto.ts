import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsDateString,
  ValidateIf,
  Min,
  MaxLength,
  IsNumber,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { sanitizeInput } from '../../utils/sanitize';
import { LoaiThoiGian } from '../entities/document.entity';

export class CreateDocumentDto {
  @IsString({ message: 'Số file không được để trống' })
  @MaxLength(100, { message: 'Số file tối đa 100 ký tự' })
  @Transform(({ value }) => sanitizeInput(value?.trim?.() ?? value))
  soFile: string;

  @IsString({ message: 'Tên file không được để trống' })
  @MaxLength(255)
  @Transform(({ value }) => sanitizeInput(value?.trim?.() ?? value))
  tenFile: string;

  @IsOptional()
  @IsString({ message: 'Tên hồ sơ không hợp lệ' })
  @MaxLength(255)
  @Transform(({ value }) => (value ? sanitizeInput(value?.trim?.() ?? value) : null))
  tenHoSo: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng tối thiểu là 1' })
  soLuong?: number = 1;

  @IsDateString({}, { message: 'Ngày lưu không hợp lệ (YYYY-MM-DD)' })
  ngayLuu: string;

  @IsOptional()
  @IsString({ message: 'Người lưu không hợp lệ' })
  @MaxLength(100)
  @Transform(({ value }) => (value ? sanitizeInput(value?.trim?.() ?? value) : null))
  nguoiLuu: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Bộ phận không hợp lệ' })
  departmentId?: number;

  @IsString({ message: 'Vị trí không được để trống' })
  @MaxLength(255)
  @Transform(({ value }) => sanitizeInput(value?.trim?.() ?? value))
  viTri: string;

  @IsOptional()
  @IsEnum(LoaiThoiGian, { message: 'Loại thời gian: thang | nam | vo_thoi_han' })
  loaiThoiGian?: LoaiThoiGian = LoaiThoiGian.NAM;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Thời gian lưu phải là số nguyên' })
  @Min(1, { message: 'Thời gian lưu tối thiểu là 1' })
  thoiGianLuu?: number | null;

  @IsOptional()
  @IsDateString({}, { message: 'Thời gian hủy không hợp lệ (YYYY-MM-DD)' })
  thoiGianHuy?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Ghi chú tối đa 2000 ký tự' })
  @Transform(({ value }) => (value ? sanitizeInput(value) : value))
  ghiChu?: string | null;
}
