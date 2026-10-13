import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { sanitizeInput } from '../../utils/sanitize';

export class CreateRoleDto {
  @IsString({
    message: 'Tên vai trò phải là một chuỗi ký tự',
  })
  @MaxLength(50, {
    message: 'Tên vai trò phải có độ dài tối đa 50 ký tự',
  })
  @Transform(({ value }) => sanitizeInput(value))
  name: string;

  @IsString({
    message: 'Mô tả phải là một chuỗi ký tự',
  })
  @IsOptional()
  @MaxLength(255)
  @Transform(({ value }) => (value ? sanitizeInput(value) : value))
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  permissionIds?: number[];
}
