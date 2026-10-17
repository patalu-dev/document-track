import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { escapeLike } from '../utils/sanitize';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
  ) {}

  async create(createDepartmentDto: CreateDepartmentDto) {
    const dept = this.departmentsRepository.create(createDepartmentDto);
    try {
      return await this.departmentsRepository.save(dept);
    } catch (error) {
      this.handleDuplicate(error);
    }
  }

  async findAll(query?: { name?: string; page?: number; limit?: number }) {
    const rawPage = Number((query as any)?.page ?? 1);
    const rawLimit = Number((query as any)?.limit ?? 10);
    const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
    const limit = Number.isFinite(rawLimit)
      ? Math.min(100, Math.max(1, Math.floor(rawLimit)))
      : 10;
    const skip = (page - 1) * limit;

    const qb = this.departmentsRepository.createQueryBuilder('dept');

    if (query?.name) {
      qb.andWhere("dept.name LIKE :name ESCAPE '\\\\'", {
        name: `%${escapeLike(query.name).slice(0, 100)}%`,
      });
    }

    const [items, total] = await qb
      .orderBy('dept.id', 'DESC')
      .take(limit)
      .skip(skip)
      .getManyAndCount();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // Dropdown không phân trang (trần 1000) cho form chứng từ
  async findAllForSelect() {
    return this.departmentsRepository.find({ order: { name: 'ASC' }, take: 1000 });
  }

  async findOne(id: number) {
    const dept = await this.departmentsRepository.findOne({ where: { id } });
    if (!dept) throw new NotFoundException(`Bộ phận #${id} không tìm thấy`);
    return dept;
  }

  async update(id: number, updateDepartmentDto: UpdateDepartmentDto) {
    const dept = await this.findOne(id);
    Object.assign(dept, updateDepartmentDto);
    try {
      return await this.departmentsRepository.save(dept);
    } catch (error) {
      this.handleDuplicate(error);
    }
  }

  async remove(id: number) {
    try {
      const result = await this.departmentsRepository.delete(id);
      if (result.affected === 0) {
        throw new NotFoundException(`Bộ phận #${id} không tìm thấy`);
      }
      return { message: 'Xóa bộ phận thành công' };
    } catch (error) {
      if (error?.errno === 1451 || error?.code === 'ER_ROW_IS_REFERENCED_2') {
        throw new ConflictException(
          'Không thể xóa bộ phận đang có chứng từ tham chiếu. Hãy chuyển chứng từ sang bộ phận khác trước.',
        );
      }
      throw error;
    }
  }

  private handleDuplicate(error: any): never {
    if (error?.errno === 1062 || error?.code === 'ER_DUP_ENTRY') {
      throw new ConflictException('Tên bộ phận đã tồn tại, vui lòng chọn tên khác');
    }
    throw error;
  }
}
