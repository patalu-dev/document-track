import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Repository, In } from 'typeorm';
import { Permission } from '../permissions/entities/permission.entity';
import { escapeLike } from '../utils/sanitize';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
  ) {}

  async create(createRoleDto: CreateRoleDto) {
    const { permissionIds, ...roleData } = createRoleDto;
    const newRole = this.rolesRepository.create(roleData);

    if (permissionIds && permissionIds.length > 0) {
      newRole.permissions = await this.permissionsRepository.findBy({
        id: In(permissionIds),
      });
    }

    try {
      return await this.rolesRepository.save(newRole);
    } catch (error) {
      this.handleDuplicateName(error);
    }
  }

  async findAll(query?: { name?: string; page?: number; limit?: number }, currentUser?: any) {
    const rawPage = Number((query as any)?.page ?? 1);
    const rawLimit = Number((query as any)?.limit ?? 10);
    const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
    const limit = Number.isFinite(rawLimit) ? Math.min(100, Math.max(1, Math.floor(rawLimit))) : 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.rolesRepository.createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'permission');

    // 1. Tìm ID của role super_admin
    const superAdminRole = await this.rolesRepository.findOne({ where: { name: 'super_admin' } });
    
    // 2. Kiểm tra xem user hiện tại có phải là super_admin không
    const isSuperAdmin = await this.isSuperAdmin(currentUser, superAdminRole);

    // 3. Nếu không phải super_admin, lọc bỏ role super_admin khỏi danh sách
    if (!isSuperAdmin && superAdminRole) {
      queryBuilder.andWhere('role.name != :saName', { saName: 'super_admin' });
    }

    if (query?.name) {
      queryBuilder.andWhere('role.name LIKE :name ESCAPE \'\\\\\'', { name: `%${escapeLike(query.name).slice(0, 100)}%` });
    }

    const [items, total] = await queryBuilder
      .take(limit)
      .skip(skip)
      .orderBy('role.id', 'DESC')
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number, currentUser?: any) {
    const role = await this.rolesRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!role) {
      throw new NotFoundException(`Role #${id} not found`);
    }
    if (role.name === 'super_admin' && currentUser && !(await this.isSuperAdmin(currentUser))) {
      throw new ForbiddenException('Chỉ super_admin mới được xem vai trò super_admin');
    }
    return role;
  }

  async update(id: number, updateRoleDto: UpdateRoleDto, currentUser?: any) {
    const { permissionIds, ...updateData } = updateRoleDto;

    const role = await this.rolesRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException(`Role #${id} not found`);
    }

    if (role.name === 'super_admin' && currentUser && !(await this.isSuperAdmin(currentUser))) {
      throw new ForbiddenException('Chỉ super_admin mới được sửa vai trò super_admin');
    }

    Object.assign(role, updateData);

    if (permissionIds !== undefined) {
      if (permissionIds.length > 0) {
        role.permissions = await this.permissionsRepository.findBy({
          id: In(permissionIds),
        });
      } else {
        role.permissions = [];
      }
    }

    try {
      return await this.rolesRepository.save(role);
    } catch (error) {
      this.handleDuplicateName(error);
    }
  }

  async remove(id: number, currentUser?: any) {
    if (currentUser) {
      const target = await this.rolesRepository.findOne({ where: { id } });
      if (target?.name === 'super_admin' && !(await this.isSuperAdmin(currentUser))) {
        throw new ForbiddenException('Chỉ super_admin mới được xóa vai trò super_admin');
      }
    }
    try {
      const result = await this.rolesRepository.delete(id);
      if (result.affected === 0) {
        throw new NotFoundException(`Role #${id} không tìm thấy`);
      }
      return { message: 'Xóa vai trò thành công' };
    } catch (error) {
      // Check for foreign key constraint violation (MySQL 1451)
      if (error.errno === 1451 || error.code === 'ER_ROW_IS_REFERENCED_2') {
        throw new ConflictException(
          'Không thể xóa vai trò này vì đang có người dùng sử dụng. Vui lòng gỡ vai trò khỏi tất cả người dùng trước khi thực hiện xóa.',
        );
      }
      throw error;
    }
  }

  private async isSuperAdmin(currentUser?: any, superAdminRole?: any): Promise<boolean> {
    if (!currentUser || !Array.isArray(currentUser.roles)) return false;
    const role = superAdminRole ?? (await this.rolesRepository.findOne({ where: { name: 'super_admin' } }));
    if (!role) return false;
    return currentUser.roles.includes(role.id);
  }

  // Trùng tên vai trò (unique) -> 409 thay vì 500
  private handleDuplicateName(error: any): never {
    if (error?.errno === 1062 || error?.code === 'ER_DUP_ENTRY') {
      throw new ConflictException('Tên vai trò đã tồn tại, vui lòng chọn tên khác');
    }
    throw error;
  }
}

