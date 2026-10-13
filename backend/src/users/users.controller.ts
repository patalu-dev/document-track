import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PoliciesGuard } from '../ability/policies.guard';
import { CheckPolicies } from '../ability/check-policies.decorator';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'create', subject: 'User' })
  create(@Body() createUserDto: CreateUserDto, @Req() req: any) {
    return this.usersService.create(createUserDto, req.user);
  }

  @Get()
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'read', subject: 'User' })
  findAll(@Query() query: { name?: string; username?: string; email?: string; role?: string; status?: string; page?: number; limit?: number; showDeleted?: string }, @Req() req: any) {
    return this.usersService.findAll(query, req.user);
  }

  @Get('export')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'read', subject: 'User' })
  exportUsers(@Query() query: { name?: string; username?: string; email?: string; role?: string; status?: string; showDeleted?: string }, @Req() req: any) {
    return this.usersService.exportAll(query, req.user);
  }

  @Get(':id')
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'read', subject: 'User' })
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.usersService.findOne(id, req.user);
  }

  @Patch(':id')
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'update', subject: 'User' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updateUserDto: UpdateUserDto, @Req() req: any) {
    return this.usersService.update(id, updateUserDto, req.user);
  }

  @Delete(':id')
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'delete', subject: 'User' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.usersService.remove(id, req.user);
  }

  @Post(':id/restore')
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'update', subject: 'User' })
  restore(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.usersService.restore(id, req.user);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post(':id/reset-password')
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'update', subject: 'User' })
  resetPassword(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.usersService.resetPassword(id, req.user);
  }

  @Delete(':id/permanent')
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'delete', subject: 'User' })
  hardRemove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.usersService.hardRemove(id, req.user);
  }
}
