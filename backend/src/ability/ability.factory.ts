import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
} from '@casl/ability';
import { Role } from '../roles/entities/role.entity';

export type AppAbility = MongoAbility;

@Injectable()
export class AbilityFactory {
  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {}

  /**
   * Build a CASL Ability instance for a given user.
   * Loads all roles (with eager-loaded permissions) from DB based on roleIds in JWT.
   */
  async createForUser(user: { id: number; username: string; roles: number[] }): Promise<AppAbility> {
    const { can, cannot, build } = new AbilityBuilder(createMongoAbility);

    if (!user.roles || user.roles.length === 0) {
      // No roles = no permissions
      return build();
    }

    // Load full role entities with their permissions from database
    const roles = await this.rolesRepository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'permission')
      .where('role.id IN (:...roleIds)', { roleIds: user.roles })
      .andWhere('role.isActive = :isActive', { isActive: true })
      .getMany();

    // Collect all permissions from all roles
    for (const role of roles) {
      for (const permission of role.permissions) {
        let conditions: any = undefined;
        if (permission.conditions) {
          try {
            const rawCond = typeof permission.conditions === 'string'
              ? permission.conditions
              : JSON.stringify(permission.conditions);

            let resolvedStr = rawCond.replace(/"\$\{user\.id\}"/g, JSON.stringify(String(user.id)));
            resolvedStr = resolvedStr.replace(/"\$\{user\.username\}"/g, JSON.stringify(user.username));
            resolvedStr = resolvedStr.replace(/\$\{user\.id\}/g, String(user.id));
            resolvedStr = resolvedStr.replace(/\$\{user\.username\}/g, String(user.username));

            conditions = JSON.parse(resolvedStr);
          } catch (e) {
            // Fail-closed: conditions hỏng thì bỏ qua rule này (deny),
            // không để permission thành không-điều-kiện (fail-open).
            continue;
          }
        }

        // Hỗ trợ nhiều action cách nhau bằng dấu phẩy
        const actions = permission.action.split(',').map(a => a.trim());

        actions.forEach(action => {
          if (permission.inverted) {
            cannot(action, permission.subject, conditions);
          } else {
            can(action, permission.subject, conditions);
          }
        });
      }
    }

    return build();
  }
}
