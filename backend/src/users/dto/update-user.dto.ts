import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// Cấm password ở PATCH generic: đổi pass chỉ qua
// POST /auth/change-password (tự đổi) hoặc POST /users/:id/reset-password (admin reset)
export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['password'] as const)) {}
