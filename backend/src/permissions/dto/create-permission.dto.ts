import { IsString, IsOptional, IsBoolean, MaxLength, IsObject, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { sanitizeInput } from '../../utils/sanitize';

// Whitelist CASL action/subject. Action cho phép comma-separated như "create,update,delete".
const ACTION_PATTERN = /^(view|manage|create|read|update|delete)(\s*,\s*(view|manage|create|read|update|delete))*$/;
const SUBJECT_PATTERN = /^(all|User|Role|Permission)$/;

export class CreatePermissionDto {
  @IsString(
    {
      message: 'Tên quyền phải là một chuỗi ký tự',
    }
  )
  @MaxLength(100, {
    message: 'Tên quyền phải có độ dài tối đa 100 ký tự',
  })
  @Transform(({ value }) => sanitizeInput(value))
  name: string;

  @IsString(
    {
      message: 'Hành động phải là một chuỗi ký tự',
    }
  )
  @MaxLength(50, {
    message: 'Hành động phải có độ dài tối đa 50 ký tự',
  })
  @Matches(ACTION_PATTERN, {
    message: 'Action chỉ gồm view|manage|create|read|update|delete, phân cách bởi dấu phẩy',
  })
  action: string;

  @IsString(
    {
      message: 'Đối tượng phải là một chuỗi ký tự',
    }
  )
  @MaxLength(100, {
    message: 'Đối tượng phải có độ dài tối đa 100 ký tự',
  })
  @Matches(SUBJECT_PATTERN, {
    message: 'Subject chỉ gồm all|User|Role|Permission',
  })
  subject: string;

  @IsString({
    message: 'Mô tả phải là một chuỗi ký tự',
  })
  @IsOptional()
  @MaxLength(255, {
    message: 'Mô tả phải có độ dài tối đa 255 ký tự',
  })
  @Transform(({ value }) => (value ? sanitizeInput(value) : value))
  description?: string;

  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  inverted?: boolean;
}
