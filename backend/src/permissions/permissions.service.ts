  import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { Permission } from './entities/permission.entity';
  import { Role } from '../roles/entities/role.entity';
  import { CreatePermissionDto } from './dto/create-permission.dto';
  import { UpdatePermissionDto } from './dto/update-permission.dto';
  import { escapeLike } from '../utils/sanitize';

  @Injectable()
  export class PermissionsService {
    constructor(
      @InjectRepository(Permission)
      private permissionsRepository: Repository<Permission>,
      @InjectRepository(Role)
      private rolesRepository: Repository<Role>,
    ) {}

    async create(createPermissionDto: CreatePermissionDto, currentUser?: any) {
      await this.assertPermissionAllowed(createPermissionDto, currentUser);
      const permission = this.permissionsRepository.create(createPermissionDto as any);
      return this.permissionsRepository.save(permission);
    }

    async findAll(query?: { name?: string; action?: string; subject?: string; search?: string; page?: number; limit?: number }) {
      const rawPage = Number((query as any)?.page ?? 1);
      const rawLimit = Number((query as any)?.limit ?? 10);
      const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
      const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, Math.floor(rawLimit))) : 10;
      const skip = (page - 1) * limit;

      const queryBuilder = this.permissionsRepository.createQueryBuilder('permission');
      
      if (query?.search) {
        const searchPattern = `%${escapeLike(query.search).slice(0, 100)}%`;
        queryBuilder.where(
          '(permission.name LIKE :search ESCAPE \'\\\\\' OR permission.action LIKE :search ESCAPE \'\\\\\' OR permission.subject LIKE :search ESCAPE \'\\\\\' )',
          { search: searchPattern }
        );
      } else {
        if (query?.name) {
          queryBuilder.andWhere('permission.name LIKE :name ESCAPE \'\\\\\'', { name: `%${escapeLike(query.name).slice(0, 100)}%` });
        }
        if (query?.action) {
          queryBuilder.andWhere('permission.action LIKE :action ESCAPE \'\\\\\'', { action: `%${escapeLike(query.action).slice(0, 50)}%` });
        }
        if (query?.subject) {
          queryBuilder.andWhere('permission.subject LIKE :subject ESCAPE \'\\\\\'', { subject: `%${escapeLike(query.subject).slice(0, 100)}%` });
        }
      }

      // Sắp xếp ưu tiên:
      // 1. subject = 'all' và action = 'manage'
      // 2. subject = 'all' và action = 'read'
      // 3. các subject = 'all' khác
      // 4. Sắp xếp theo subject (A-Z)
      const [items, total] = await queryBuilder
        .orderBy(`CASE 
          WHEN permission.subject = 'all' AND permission.action = 'manage' THEN 1
          WHEN permission.subject = 'all' AND (permission.action = 'read' OR permission.action LIKE '%read%') THEN 2
          WHEN permission.subject = 'all' THEN 3
          ELSE 4 
        END`, 'ASC')
        .addOrderBy('permission.subject', 'ASC')
        .addOrderBy('permission.action', 'ASC')
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    async findOne(id: number) {
      const permission = await this.permissionsRepository.findOneBy({ id });
      if (!permission) {
        throw new NotFoundException(`Permission #${id} not found`);
      }
      return permission;
    }

    async update(id: number, updatePermissionDto: UpdatePermissionDto, currentUser?: any) {
      const permission = await this.findOne(id);
      const merged = { ...permission, ...updatePermissionDto };
      await this.assertPermissionAllowed(merged, currentUser);
      Object.assign(permission, updatePermissionDto);
      return this.permissionsRepository.save(permission);
    }

    async remove(id: number) {
      const permission = await this.findOne(id);
      try {
        return await this.permissionsRepository.remove(permission);
      } catch (error) {
        if (error.errno === 1451 || error.code === 'ER_ROW_IS_REFERENCED_2') {
          throw new ConflictException(
            'Không thể xóa quyền này vì đang được gắn với một hoặc nhiều vai trò. Vui lòng gỡ quyền này khỏi các vai trò trước khi thực hiện xóa.',
          );
        }
        throw error;
      }
    }


    /**
     * Get all unique actions that exist in the code
     */
    async getAvailableActions(): Promise<string[]> {
      const standardActions = [
        'view',
        'manage',
        'create',
        'read',
        'update',
        'delete'
      ];

      return standardActions;
    }

    /**
     * Get all unique subjects that exist in the code
     */
    async getAvailableSubjects(): Promise<string[]> {
      const standardSubjects = [
        'all',
        'User',
        'Role',
        'Permission',
      ];

      return standardSubjects;
    }

    private async assertPermissionAllowed(dto: { action?: string; subject?: string; conditions?: any }, currentUser?: any): Promise<void> {
      const actions = String(dto.action ?? '').split(',').map((a) => a.trim()).filter(Boolean);
      const allowedActions = new Set(['view', 'manage', 'create', 'read', 'update', 'delete']);
      const allowedSubjects = new Set(['all', 'User', 'Role', 'Permission']);
      if (actions.length === 0 || !actions.every((a) => allowedActions.has(a))) {
        throw new BadRequestException('Action không hợp lệ');
      }
      if (!dto.subject || !allowedSubjects.has(dto.subject)) {
        throw new BadRequestException('Subject không hợp lệ');
      }
      if (dto.conditions !== undefined && dto.conditions !== null) {
        this.assertConditionsSafe(dto.conditions);
      }
      // manage/all là quyền tối cao -> chỉ super_admin
      const isElevated = actions.includes('manage') || dto.subject === 'all';
      if (isElevated && currentUser && !(await this.isSuperAdmin(currentUser))) {
        throw new ForbiddenException('Chỉ super_admin mới được tạo/sửa quyền manage/all');
      }
    }

    private assertConditionsSafe(conditions: any): void {
      if (typeof conditions !== 'object' || Array.isArray(conditions)) {
        throw new BadRequestException('Conditions phải là object');
      }
      const raw = JSON.stringify(conditions);
      if (raw.length > 2000) {
        throw new BadRequestException('Conditions quá dài');
      }
      const check = (node: any): void => {
        if (node && typeof node === 'object') {
          for (const key of Object.keys(node)) {
            if (key.startsWith('$') || key === '__proto__' || key === 'constructor' || key === 'prototype') {
              throw new BadRequestException(`Conditions key không hợp lệ: ${key}`);
            }
            const val = (node as any)[key];
            if (val && typeof val === 'object') {
              check(val);
            } else if (val !== null && !['string', 'number', 'boolean'].includes(typeof val)) {
              throw new BadRequestException('Conditions value không hợp lệ');
            }
          }
        }
      };
      check(conditions);
    }

    private async isSuperAdmin(currentUser?: any): Promise<boolean> {
      if (!currentUser || !Array.isArray(currentUser.roles)) return false;
      const role = await this.rolesRepository.findOne({ where: { name: 'super_admin' } });
      if (!role) return false;
      return currentUser.roles.includes(role.id);
    }
  }
