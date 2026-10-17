import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { escapeLike } from '../utils/sanitize';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {}

  async create(createUserDto: CreateUserDto, currentUser?: any) {
    const { roleIds, ...userData } = createUserDto;

    // Chỉ super_admin mới được gán quyền super_admin cho user khác
    if (roleIds && roleIds.length > 0 && currentUser) {
      const superAdminId = await this.getSuperAdminRoleId();
      const callerIsSuperAdmin = await this.isSuperAdmin(currentUser);
      if (superAdminId && roleIds.includes(superAdminId) && !callerIsSuperAdmin) {
        throw new ForbiddenException('Chỉ super_admin mới được gán quyền super_admin');
      }
    }

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(userData.password || '123456', salt);

    // 1 thời điểm chỉ 1 active / username: muốn tạo trùng phải xóa mềm thằng cũ trước
    await this.assertUsernameAvailable(userData.username);
    if ((userData as any).email) {
      await this.assertEmailAvailable((userData as any).email);
    }
    
    const newUser = this.usersRepository.create({
      ...userData,
      password: hashedPassword,
      roles: roleIds ? roleIds.map(id => ({ id })) : [],
    } as any);
    
    return this.usersRepository.save(newUser);
  }

  async findAll(query?: { name?: string; username?: string; email?: string; role?: string; status?: string; page?: number; limit?: number; showDeleted?: string }, currentUser?: any, maxLimit = 100) {
    const rawPage = Number((query as any)?.page ?? 1);
    const rawLimit = Number((query as any)?.limit ?? 10);
    const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
    const limit = Number.isFinite(rawLimit) ? Math.min(maxLimit, Math.max(1, Math.floor(rawLimit))) : 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.usersRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role');

    // 1. Tìm role super_admin
    const superAdminRole = await this.rolesRepository.findOne({ where: { name: 'super_admin' } });
    
    // 2. Kiểm tra xem người đang xem có phải là super_admin không
    const isSuperAdmin = await this.isSuperAdmin(currentUser, superAdminRole);

    // 3. Nếu KHÔNG phải super_admin, lọc bỏ những user có role super_admin
    if (!isSuperAdmin && superAdminRole) {
      // Sử dụng subquery để lọc bỏ những user có ít nhất 1 role là super_admin
      queryBuilder.andWhere(qb => {
        const subQuery = qb.subQuery()
          .select('u.id')
          .from(User, 'u')
          .innerJoin('u.roles', 'r')
          .where('r.id = :saId', { saId: superAdminRole.id })
          .getQuery();
        return 'user.id NOT IN ' + subQuery;
      });
    }

    if (query?.showDeleted === 'true') {
      queryBuilder.withDeleted().andWhere('user.deletedAt IS NOT NULL');
    }

    if (query?.name) {
      queryBuilder.andWhere('user.name LIKE :name ESCAPE \'\\\\\'', { name: `%${escapeLike(query.name).slice(0, 100)}%` });
    }
    if (query?.username) {
      queryBuilder.andWhere('user.username LIKE :username ESCAPE \'\\\\\'', { username: `%${escapeLike(query.username).slice(0, 100)}%` });
    }
    if (query?.email) {
      queryBuilder.andWhere('user.email LIKE :email ESCAPE \'\\\\\'', { email: `%${escapeLike(query.email).slice(0, 100)}%` });
    }
    if (query?.status) {
      if (query.status === 'active') {
        queryBuilder.andWhere('user.isActive = :isActive', { isActive: true });
      } else if (query.status === 'inactive') {
        queryBuilder.andWhere('user.isActive = :isActive', { isActive: false });
      }
    }
    if (query?.role) {
      const roles = query.role.split(',');
      queryBuilder.innerJoin('user.roles', 'role_filter', 'role_filter.name IN (:...roles)', { roles });
    }

    const [items, total] = await queryBuilder
      .orderBy('user.id', 'DESC')
      .take(limit)
      .skip(skip)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Export CSV: dùng chung filter + phân quyền với findAll nhưng trần riêng 5000.
  // Không đi qua cap 100 của list thường nên file không bị thiếu âm thầm.
  async exportAll(query?: { name?: string; username?: string; email?: string; role?: string; status?: string; showDeleted?: string }, currentUser?: any) {
    const result = await this.findAll({ ...(query ?? {}), page: 1, limit: 5000 }, currentUser, 5000);
    return { items: result.items, total: result.total };
  }

  async findOne(id: number, currentUser?: any) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['roles'],
    });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    // Chặn đọc trực tiếp super_admin nếu người gọi không phải super_admin (chống IDOR)
    if (currentUser) {
      const targetIsSA = await this.targetIsSuperAdmin(user);
      if (targetIsSA && !(await this.isSuperAdmin(currentUser))) {
        throw new ForbiddenException('Chỉ super_admin mới được xem tài khoản super_admin');
      }
    }
    return user;
  }

  findByUsername(username: string) {
    return this.usersRepository.findOne({
      where: { username },
      relations: ['roles', 'roles.permissions'],
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto, currentUser?: any) {
    const { roleIds, ...updateData } = updateUserDto;
    
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['roles'],
    });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    // User không được sửa thông tin: toàn bộ PATCH chỉ admin/super_admin (đổi pass đi đường riêng)
    if (currentUser) {
      if (!(await this.isAdminOrSuperAdmin(currentUser))) {
        throw new ForbiddenException('Chỉ admin mới được sửa thông tin người dùng');
      }
      const targetIsSA = await this.targetIsSuperAdmin(user);
      if (targetIsSA && !(await this.isSuperAdmin(currentUser))) {
        throw new ForbiddenException('Chỉ super_admin mới được sửa tài khoản super_admin');
      }
      // Chỉ super_admin mới được gán quyền super_admin cho user khác
      if (roleIds && roleIds.length > 0) {
        const superAdminId = await this.getSuperAdminRoleId();
        if (superAdminId && roleIds.includes(superAdminId) && !(await this.isSuperAdmin(currentUser))) {
          throw new ForbiddenException('Chỉ super_admin mới được gán quyền super_admin');
        }
      }
    }

    // Chống tự khóa / tự hạ quyền chính mình (1 click nhầm là mất admin).
    // Chỉ chặn khi giá trị THỰC SỰ đổi (FE luôn gửi kèm roleIds kể cả không sửa).
    if (currentUser && Number((currentUser as any).id) === Number(id)) {
      if ((updateData as any).isActive !== undefined && (updateData as any).isActive !== user.isActive) {
        throw new ForbiddenException('Không thể tự khóa hoặc mở khóa tài khoản của chính mình');
      }
      if (roleIds !== undefined && this.haveRolesChanged(user.roles, roleIds)) {
        throw new ForbiddenException('Không thể tự thay đổi vai trò của chính mình');
      }
    }

    // Defense-in-depth: DTO đã Omit password, nhưng chặn luôn nếu client cố lách pipe
    if ((updateData as any).password !== undefined) {
      throw new ForbiddenException('Đổi mật khẩu phải dùng API change-password / reset-password riêng');
    }

    // Đổi username/email sang trùng active khác -> chặn (giữ 1 active / username)
    if ((updateData as any).username && (updateData as any).username !== user.username) {
      await this.assertUsernameAvailable((updateData as any).username, id);
    }
    if ((updateData as any).email && (updateData as any).email !== (user as any).email) {
      await this.assertEmailAvailable((updateData as any).email, id);
    }
    
    // Update basic fields
    Object.assign(user, updateData);
    
    // Update relations
    if (roleIds) {
      user.roles = roleIds.map(id => ({ id } as any));
    }
    
    return this.usersRepository.save(user);
  }

  async remove(id: number, currentUser?: any) {
    if (currentUser && Number((currentUser as any).id) === Number(id)) {
      throw new ForbiddenException('Không thể tự xóa tài khoản của chính mình');
    }
    await this.assertNotSuperAdminTarget(id, currentUser, 'xóa');
    try {
      const result = await this.usersRepository.softDelete(id);
      if (result.affected === 0) {
        throw new NotFoundException(`User #${id} không tìm thấy`);
      }
      return { message: 'Xóa người dùng thành công' };
    } catch (error) {
      if (error.errno === 1451 || error.code === 'ER_ROW_IS_REFERENCED_2') {
        throw new ConflictException(
          'Không thể xóa người dùng này vì đang có dữ liệu liên quan khác tham chiếu tới. Vui lòng kiểm tra lại.',
        );
      }
      throw error;
    }
  }

  async hardRemove(id: number, currentUser?: any) {
    if (currentUser && Number((currentUser as any).id) === Number(id)) {
      throw new ForbiddenException('Không thể tự xóa vĩnh viễn tài khoản của chính mình');
    }
    await this.assertNotSuperAdminTarget(id, currentUser, 'xóa vĩnh viễn');
    try {
      const result = await this.usersRepository.delete(id);
      if (result.affected === 0) {
        throw new NotFoundException(`User #${id} không tìm thấy`);
      }
      return { message: 'Xóa vĩnh viễn người dùng thành công' };
    } catch (error) {
      if (error.errno === 1451 || error.code === 'ER_ROW_IS_REFERENCED_2') {
        throw new ConflictException(
          'Không thể xóa vĩnh viễn người dùng này vì đang có dữ liệu liên quan khác tham chiếu tới. Vui lòng kiểm tra lại.',
        );
      }
      throw error;
    }
  }
  async restore(id: number, currentUser?: any) {
    await this.assertNotSuperAdminTarget(id, currentUser, 'khôi phục');
    const target = await this.usersRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!target) {
      throw new NotFoundException(`User #${id} không tìm thấy hoặc chưa bị xóa`);
    }
    if (!target.deletedAt) {
      return { message: 'Tài khoản chưa bị xóa' };
    }
    // Khôi phục không được tạo ra 2 active trùng username
    await this.assertUsernameAvailable(target.username);
    if ((target as any).email) {
      await this.assertEmailAvailable((target as any).email);
    }
    const result = await this.usersRepository.restore(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User #${id} không tìm thấy hoặc chưa bị xóa`);
    }
    return { message: 'Khôi phục người dùng thành công' };
  }

  async updateRefreshToken(id: number, refreshToken: string | null) {
    await this.usersRepository.update(id, { refreshToken });
  }

  // Dùng nội bộ cho đổi pass (tự đổi + admin reset), không đi qua UpdateUserDto
  async updatePassword(id: number, plainPassword: string) {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    const salt = await bcrypt.genSalt();
    user.password = await bcrypt.hash(plainPassword, salt);
    await this.usersRepository.save(user);
    // Đá mọi session refresh cũ + tăng tokenVersion để access cũ hết hiệu lực
    await this.updateRefreshToken(id, null);
    await this.bumpTokenVersion(id);
  }

  async bumpTokenVersion(id: number): Promise<void> {
    await this.usersRepository.increment({ id }, 'tokenVersion', 1);
  }

  // Admin reset pass về mặc định cho user. Chỉ admin/super_admin được gọi,
  // và chỉ super_admin mới được reset acc super_admin.
  async resetPassword(id: number, currentUser: any) {
    if (!currentUser || !(await this.isAdminOrSuperAdmin(currentUser))) {
      throw new ForbiddenException('Chỉ admin mới được đặt lại mật khẩu cho người khác');
    }
    const target = await this.usersRepository.findOne({
      where: { id },
      relations: ['roles'],
    });
    if (!target) {
      throw new NotFoundException(`User #${id} not found`);
    }
    if ((await this.targetIsSuperAdmin(target)) && !(await this.isSuperAdmin(currentUser))) {
      throw new ForbiddenException('Chỉ super_admin mới được đặt lại mật khẩu super_admin');
    }
    if (currentUser.id === id) {
      throw new ForbiddenException('Dùng chức năng tự đổi mật khẩu cho chính mình');
    }
    await this.updatePassword(id, '123456');
    return { message: `Đã đặt lại mật khẩu cho ${target.username} về mặc định` };
  }

  private async getSuperAdminRoleId(): Promise<number | null> {
    const role = await this.rolesRepository.findOne({ where: { name: 'super_admin' } });
    return role ? role.id : null;
  }

  private async isSuperAdmin(currentUser?: any, superAdminRole?: any): Promise<boolean> {
    if (!currentUser || !Array.isArray(currentUser.roles)) return false;
    const role = superAdminRole ?? (await this.rolesRepository.findOne({ where: { name: 'super_admin' } }));
    if (!role) return false;
    return currentUser.roles.includes(role.id);
  }

  private async isAdminOrSuperAdmin(currentUser?: any): Promise<boolean> {
    if (!currentUser || !Array.isArray(currentUser.roles)) return false;
    const roles = await this.rolesRepository.find();
    const allowedIds = roles.filter((r) => r.name === 'admin' || r.name === 'super_admin').map((r) => r.id);
    return currentUser.roles.some((id: number) => allowedIds.includes(id));
  }

  private async targetIsSuperAdmin(target: { roles?: { id: number; name?: string }[] }): Promise<boolean> {
    if (!target.roles || target.roles.length === 0) return false;
    // Trường hợp roles đã load kèm name
    if (target.roles.some((r) => (r as any).name === 'super_admin')) return true;
    const superAdminId = await this.getSuperAdminRoleId();
    if (!superAdminId) return false;
    return target.roles.some((r) => r.id === superAdminId);
  }

  private async assertNotSuperAdminTarget(id: number, currentUser: any | undefined, action: string): Promise<void> {
    if (!currentUser) return; // gọi nội bộ (auth/seed) thì bỏ qua
    const target = await this.usersRepository.findOne({
      where: { id },
      relations: ['roles'],
      withDeleted: true,
    });
    if (!target) return; // để hàm chính trả 404
    if ((await this.targetIsSuperAdmin(target)) && !(await this.isSuperAdmin(currentUser))) {
      throw new ForbiddenException(`Chỉ super_admin mới được ${action} tài khoản super_admin`);
    }
  }

  // So sánh tập roles hiện tại với roleIds mới (không quan tâm thứ tự).
  // Dùng cho chặn tự đổi quyền: FE luôn gửi kèm roleIds nên chỉ chặn khi thực sự khác.
  private haveRolesChanged(currentRoles: { id: number }[] | undefined, nextRoleIds: number[]): boolean {
    const current = (currentRoles ?? []).map((r) => Number(r.id)).sort((a, b) => a - b);
    const next = [...nextRoleIds].map((v) => Number(v)).sort((a, b) => a - b);
    return current.length !== next.length || current.some((v, i) => v !== next[i]);
  }

  // 1 thời điểm chỉ 1 active / username (findOne mặc định loại deletedAt).
  // Muốn tạo trùng phải xóa mềm thằng cũ trước, lịch sử vẫn tra được qua withDeleted.
  private async assertUsernameAvailable(username: string, excludeId?: number): Promise<void> {
    if (!username) return;
    const existing = await this.usersRepository.findOne({ where: { username } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `Username "${username}" đang được dùng bởi tài khoản active #${existing.id}, phải xóa mềm trước khi tạo trùng`,
      );
    }
  }

  private async assertEmailAvailable(email: string, excludeId?: number): Promise<void> {
    if (!email) return;
    const existing = await this.usersRepository.findOne({ where: { email } as any });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException(
        `Email "${email}" đang được dùng bởi tài khoản active #${existing.id}, phải xóa mềm trước khi tạo trùng`,
      );
    }
  }
}
