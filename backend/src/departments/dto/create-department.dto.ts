import { IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { sanitizeInput } from '../../utils/sanitize';

export class CreateDepartmentDto {
  @IsString({ message: 'Tên bộ phận phải là chuỗi ký tự' })
  @MinLength(1, { message: 'Tên bộ phận không được để trống' })
  @MaxLength(100, { message: 'Tên bộ phận tối đa 100 ký tự' })
  @Transform(({ value }) => sanitizeInput(value?.trim?.() ?? value))
  name: string;
}
