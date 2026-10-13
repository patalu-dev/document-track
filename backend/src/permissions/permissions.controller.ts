import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PoliciesGuard } from '../ability/policies.guard';
import { CheckPolicies } from '../ability/check-policies.decorator';

@UseGuards(JwtAuthGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'create', subject: 'Permission' })
  create(@Body() createPermissionDto: CreatePermissionDto, @Req() req: any) {
    return this.permissionsService.create(createPermissionDto, req.user);
  }

  @Get()
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'read', subject: 'Permission' })
  findAll(@Query() query: { action?: string; subject?: string; page?: number; limit?: number }) {
    return this.permissionsService.findAll(query);
  }

  @Get('actions')
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'read', subject: 'Permission' })
  getActions() {
    return this.permissionsService.getAvailableActions();
  }

  @Get('subjects')
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'read', subject: 'Permission' })
  getSubjects() {
    return this.permissionsService.getAvailableSubjects();
  }

  @Get(':id')
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'read', subject: 'Permission' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.permissionsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'update', subject: 'Permission' })
  update(@Param('id', ParseIntPipe) id: number, @Body() updatePermissionDto: UpdatePermissionDto, @Req() req: any) {
    return this.permissionsService.update(id, updatePermissionDto, req.user);
  }

  @Delete(':id')
  @UseGuards(PoliciesGuard)
  @CheckPolicies({ action: 'delete', subject: 'Permission' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.permissionsService.remove(id);
  }
}
