import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document, LoaiThoiGian, TrangThaiChungTu } from './entities/document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { BulkCreateDocumentDto, ChangeLocationDto } from './dto/bulk-document.dto';
import { Department } from '../departments/entities/department.entity';
import { applyKeywordSearch } from '../utils/search';
import { DocumentLogsService } from '../document-logs/document-logs.service';
import { HanhDongChungTu } from '../document-logs/entities/document-log.entity';

export interface DocumentQuery {
  keyword?: string;
  departmentId?: number;
  viTri?: string;
  loaiThoiGian?: string;
  trangThai?: string;
  ngayLuuTu?: string; // YYYY-MM-DD
  ngayLuuDen?: string; // YYYY-MM-DD
  sapHetHan?: string; // 'true' => thoiGianHuy trong 30 ngày tới & còn lưu kho
  quaHanHuy?: string; // 'true' => thoiGianHuy < hôm nay & còn lưu kho
  page?: number;
  limit?: number;
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
    private documentLogsService: DocumentLogsService,
  ) {}

  /** Chuẩn hóa cột date của MySQL (string hoặc Date) về 'YYYY-MM-DD' */
  private toDateOnly(v: unknown): string | null {
    if (!v) return null;
    if (typeof v === 'string') {
      const m = v.slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(m) ? m : null;
    }
    if (v instanceof Date && !Number.isNaN(v.getTime())) {
      const y = v.getFullYear();
      const mo = String(v.getMonth() + 1).padStart(2, '0');
      const d = String(v.getDate()).padStart(2, '0');
      return `${y}-${mo}-${d}`;
    }
    return null;
  }

  /** Tính ngày hủy từ ngày lưu + thời gian lưu */
  computeThoiGianHuy(
    ngayLuu: string,
    loai: LoaiThoiGian,
    thoiGianLuu?: number | null,
    explicit?: string | null,
  ): string | null {
    if (loai === LoaiThoiGian.VO_THOI_HAN) return null;
    // Cho phép người dùng nhập tay ngày hủy thì ưu tiên
    if (explicit) return explicit;
    if (!thoiGianLuu || thoiGianLuu < 1) return null;
    const d = new Date(ngayLuu);
    if (Number.isNaN(d.getTime())) return null;
    if (loai === LoaiThoiGian.THANG) {
      d.setMonth(d.getMonth() + thoiGianLuu);
    } else {
      d.setFullYear(d.getFullYear() + thoiGianLuu);
    }
    return d.toISOString().split('T')[0];
  }

  private validateBusiness(dto: {
    loaiThoiGian?: LoaiThoiGian;
    thoiGianLuu?: number | null;
  }) {
    if (
      dto.loaiThoiGian &&
      dto.loaiThoiGian !== LoaiThoiGian.VO_THOI_HAN &&
      (dto.thoiGianLuu === null || dto.thoiGianLuu === undefined)
    ) {
      throw new BadRequestException(
        'Thời gian lưu bắt buộc khi loại thời gian là tháng/năm',
      );
    }
    if (dto.loaiThoiGian === LoaiThoiGian.VO_THOI_HAN && dto.thoiGianLuu) {
      throw new BadRequestException(
        'Chứng từ vô thời hạn không được nhập thời gian lưu',
      );
    }
  }

  /** So sánh trước/sau để ghi chi tiết log sửa */
  private buildDiff(before: Record<string, any>, after: Record<string, any>): string {
    const fields: { key: string; label: string }[] = [
      { key: 'soFile', label: 'Số file' },
      { key: 'tenFile', label: 'Tên file' },
      { key: 'tenHoSo', label: 'Tên hồ sơ' },
      { key: 'soLuong', label: 'Số lượng' },
      { key: 'ngayLuu', label: 'Ngày lưu' },
      { key: 'nguoiLuu', label: 'Người lưu' },
      { key: 'departmentId', label: 'Bộ phận' },
      { key: 'viTri', label: 'Vị trí' },
      { key: 'loaiThoiGian', label: 'Loại thời gian' },
      { key: 'thoiGianLuu', label: 'Thời gian lưu' },
      { key: 'thoiGianHuy', label: 'Thời gian hủy' },
      { key: 'ghiChu', label: 'Ghi chú' },
      { key: 'trangThai', label: 'Trạng thái' },
    ];
    const fmt = (v: any) => {
      if (v === null || v === undefined || v === '') return '---';
      if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
      return String(v);
    };
    const changes: string[] = [];
    for (const f of fields) {
      const b = before[f.key] ?? null;
      const a = after[f.key] ?? null;
      if (fmt(b) !== fmt(a)) changes.push(`${f.label}: '${fmt(b)}' → '${fmt(a)}'`);
    }
    return changes.join('; ');
  }

  private actorName(currentUser?: any): string | null {
    if (!currentUser) return null;
    return (
      currentUser?.name ?? currentUser?.username ?? String(currentUser?.id ?? '')
    ).slice(0, 100) || null;
  }

  async create(createDocumentDto: CreateDocumentDto, currentUser?: any) {
    const loai = createDocumentDto.loaiThoiGian ?? LoaiThoiGian.NAM;
    this.validateBusiness({ loaiThoiGian: loai, thoiGianLuu: createDocumentDto.thoiGianLuu });

    if (createDocumentDto.departmentId) {
      const dept = await this.departmentsRepository.findOne({
        where: { id: Number(createDocumentDto.departmentId) },
      });
      if (!dept) throw new BadRequestException('Bộ phận không tồn tại');
    }

    const doc = this.documentsRepository.create({
      ...createDocumentDto,
      soLuong: createDocumentDto.soLuong ?? 1,
      loaiThoiGian: loai,
      thoiGianLuu: loai === LoaiThoiGian.VO_THOI_HAN ? null : (createDocumentDto.thoiGianLuu ?? null),
      thoiGianHuy: this.computeThoiGianHuy(
        createDocumentDto.ngayLuu,
        loai,
        createDocumentDto.thoiGianLuu,
        createDocumentDto.thoiGianHuy,
      ),
      createdBy: this.actorName(currentUser),
    });
    const saved = await this.documentsRepository.save(doc);
    await this.documentLogsService.log({
      documentId: saved.id,
      soFile: saved.soFile,
      action: HanhDongChungTu.THEM,
      actor: this.actorName(currentUser),
      details: `Thêm chứng từ '${saved.tenFile}' tại ${saved.viTri}`,
    });
    return saved;
  }

  /** Import nhiều chứng từ (từ Excel/CSV đã parse ở FE), tối đa 500 dòng */
  async bulkCreate(dto: BulkCreateDocumentDto, currentUser?: any) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Danh sách chứng từ trống');
    }
    const actor = this.actorName(currentUser);
    const docs: Document[] = [];
    const errors: { index: number; soFile?: string; message: string }[] = [];

    // Cache departments để check nhanh
    const deptIds = [...new Set(dto.items.map((i) => i.departmentId).filter(Boolean))].map(Number);
    const deptMap = new Map<number, boolean>();
    if (deptIds.length > 0) {
      const found = await this.departmentsRepository
        .createQueryBuilder('d')
        .where('d.id IN (:...ids)', { ids: deptIds })
        .getMany();
      found.forEach((d) => deptMap.set(d.id, true));
    }

    dto.items.forEach((item, index) => {
      try {
        const loai = item.loaiThoiGian ?? LoaiThoiGian.NAM;
        this.validateBusiness({ loaiThoiGian: loai, thoiGianLuu: item.thoiGianLuu });
        if (!item.soFile || !item.tenFile || !item.ngayLuu || !item.viTri) {
          throw new BadRequestException('Thiếu trường bắt buộc (soFile, tenFile, ngayLuu, viTri)');
        }
        if (item.departmentId && !deptMap.has(Number(item.departmentId))) {
          throw new BadRequestException(`Bộ phận #${item.departmentId} không tồn tại`);
        }
        docs.push(
          this.documentsRepository.create({
            ...item,
            soLuong: item.soLuong ?? 1,
            loaiThoiGian: loai,
            thoiGianLuu: loai === LoaiThoiGian.VO_THOI_HAN ? null : (item.thoiGianLuu ?? null),
            thoiGianHuy: this.computeThoiGianHuy(item.ngayLuu, loai, item.thoiGianLuu, item.thoiGianHuy),
            createdBy: actor,
          }),
        );
      } catch (e: any) {
        errors.push({ index: index + 1, soFile: item?.soFile, message: e?.message ?? 'Dữ liệu không hợp lệ' });
      }
    });

    let saved: Document[] = [];
    if (docs.length > 0) {
      saved = await this.documentsRepository.save(docs);
      for (const s of saved) {
        await this.documentLogsService.log({
          documentId: s.id,
          soFile: s.soFile,
          action: HanhDongChungTu.THEM,
          actor,
          details: `Import Excel: thêm chứng từ '${s.tenFile}' tại ${s.viTri}`,
        });
      }
    }
    return { saved: saved.length, failed: errors.length, errors, items: saved };
  }

  async findAll(query?: DocumentQuery) {
    const rawPage = Number((query as any)?.page ?? 1);
    const rawLimit = Number((query as any)?.limit ?? 10);
    const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
    const limit = Number.isFinite(rawLimit)
      ? Math.min(100, Math.max(1, Math.floor(rawLimit)))
      : 10;
    const skip = (page - 1) * limit;

    const qb = this.documentsRepository
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.department', 'dept');

    if (query?.keyword) {
      applyKeywordSearch(
        qb,
        ['doc.soFile', 'doc.tenFile', 'doc.tenHoSo'],
        query.keyword,
        'kw',
      );
    }
    if (query?.departmentId) {
      qb.andWhere('doc.departmentId = :deptId', { deptId: Number(query.departmentId) });
    }
    if (query?.viTri) {
      applyKeywordSearch(qb, ['doc.viTri'], query.viTri, 'vt');
    }
    if (query?.loaiThoiGian) {
      qb.andWhere('doc.loaiThoiGian = :loai', { loai: query.loaiThoiGian });
    }
    if (query?.trangThai) {
      qb.andWhere('doc.trangThai = :tt', { tt: query.trangThai });
    }
    if (query?.ngayLuuTu && /^\d{4}-\d{2}-\d{2}$/.test(query.ngayLuuTu)) {
      qb.andWhere('doc.ngayLuu >= :ngayTu', { ngayTu: query.ngayLuuTu });
    }
    if (query?.ngayLuuDen && /^\d{4}-\d{2}-\d{2}$/.test(query.ngayLuuDen)) {
      qb.andWhere('doc.ngayLuu <= :ngayDen', { ngayDen: query.ngayLuuDen });
    }
    const today = new Date().toISOString().split('T')[0];
    if (query?.sapHetHan === 'true') {
      const in30 = new Date();
      in30.setDate(in30.getDate() + 30);
      qb.andWhere('doc.thoiGianHuy IS NOT NULL')
        .andWhere('doc.thoiGianHuy >= :today', { today })
        .andWhere('doc.thoiGianHuy <= :in30', { in30: in30.toISOString().split('T')[0] })
        .andWhere('doc.trangThai = :luuKho', { luuKho: TrangThaiChungTu.LUU_KHO });
    }
    if (query?.quaHanHuy === 'true') {
      qb.andWhere('doc.thoiGianHuy IS NOT NULL')
        .andWhere('doc.thoiGianHuy < :today', { today })
        .andWhere('doc.trangThai = :luuKho', { luuKho: TrangThaiChungTu.LUU_KHO });
    }

    const [items, total] = await qb
      .orderBy('doc.id', 'DESC')
      .take(limit)
      .skip(skip)
      .getManyAndCount();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async exportAll(query?: DocumentQuery) {
    const result = await this.findAll({ ...(query ?? {}), page: 1, limit: 100 });
    // findAll cap 100 -> query lại với trần 5000
    const qb = this.documentsRepository
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.department', 'dept');
    if (query?.keyword) {
      applyKeywordSearch(
        qb,
        ['doc.soFile', 'doc.tenFile', 'doc.tenHoSo'],
        query.keyword,
        'kw',
      );
    }
    if (query?.departmentId) qb.andWhere('doc.departmentId = :deptId', { deptId: Number(query.departmentId) });
    if (query?.trangThai) qb.andWhere('doc.trangThai = :tt', { tt: query.trangThai });
    if (query?.viTri) {
      applyKeywordSearch(qb, ['doc.viTri'], query.viTri, 'vt');
    }
    if (query?.ngayLuuTu && /^\d{4}-\d{2}-\d{2}$/.test(query.ngayLuuTu)) {
      qb.andWhere('doc.ngayLuu >= :ngayTu', { ngayTu: query.ngayLuuTu });
    }
    if (query?.ngayLuuDen && /^\d{4}-\d{2}-\d{2}$/.test(query.ngayLuuDen)) {
      qb.andWhere('doc.ngayLuu <= :ngayDen', { ngayDen: query.ngayLuuDen });
    }
    const items = await qb.orderBy('doc.id', 'DESC').take(5000).getMany();
    return { items, total: result.total };
  }

  async stats() {
    const today = new Date().toISOString().split('T')[0];
    const in30 = new Date();
    in30.setDate(in30.getDate() + 30);
    const in30Str = in30.toISOString().split('T')[0];

    const total = await this.documentsRepository.count();
    const luuKho = await this.documentsRepository.count({ where: { trangThai: TrangThaiChungTu.LUU_KHO } });
    const dangMuon = await this.documentsRepository.count({ where: { trangThai: TrangThaiChungTu.DANG_MUON } });
    const sapHetHan = await this.documentsRepository
      .createQueryBuilder('d')
      .where('d.thoiGianHuy IS NOT NULL')
      .andWhere('d.thoiGianHuy >= :today', { today })
      .andWhere('d.thoiGianHuy <= :in30', { in30: in30Str })
      .andWhere('d.trangThai = :tt', { tt: TrangThaiChungTu.LUU_KHO })
      .getCount();
    const quaHanHuy = await this.documentsRepository
      .createQueryBuilder('d')
      .where('d.thoiGianHuy IS NOT NULL')
      .andWhere('d.thoiGianHuy < :today', { today })
      .andWhere('d.trangThai = :tt', { tt: TrangThaiChungTu.LUU_KHO })
      .getCount();
    return { total, luuKho, dangMuon, sapHetHan, quaHanHuy };
  }

  async findOne(id: number) {
    const doc = await this.documentsRepository.findOne({
      where: { id },
      relations: ['department', 'borrowRecords'],
    });
    if (!doc) throw new NotFoundException(`Chứng từ #${id} không tìm thấy`);
    // Sắp xếp lịch sử mượn mới nhất trước
    if (doc.borrowRecords) {
      doc.borrowRecords.sort((a, b) => b.id - a.id);
    }
    return doc;
  }

  async update(id: number, updateDocumentDto: UpdateDocumentDto, currentUser?: any) {
    const doc = await this.documentsRepository.findOne({ where: { id } });
    if (!doc) throw new NotFoundException(`Chứng từ #${id} không tìm thấy`);
    const before = { ...doc };

    if (updateDocumentDto.departmentId) {
      const dept = await this.departmentsRepository.findOne({
        where: { id: Number(updateDocumentDto.departmentId) },
      });
      if (!dept) throw new ConflictException('Bộ phận không tồn tại');
    }

    const merged = {
      loaiThoiGian: updateDocumentDto.loaiThoiGian ?? doc.loaiThoiGian,
      thoiGianLuu: updateDocumentDto.thoiGianLuu !== undefined ? updateDocumentDto.thoiGianLuu : doc.thoiGianLuu,
    };
    this.validateBusiness(merged);

    Object.assign(doc, updateDocumentDto);
    if (merged.loaiThoiGian === LoaiThoiGian.VO_THOI_HAN) {
      doc.thoiGianLuu = null;
      doc.thoiGianHuy = null;
    } else if (
      updateDocumentDto.ngayLuu !== undefined ||
      updateDocumentDto.loaiThoiGian !== undefined ||
      updateDocumentDto.thoiGianLuu !== undefined ||
      updateDocumentDto.thoiGianHuy !== undefined
    ) {
      // Ngày hủy luôn tự tính lại = ngày lưu + thời gian lưu;
      // chỉ dùng giá trị truyền tường minh (import) khi có.
      doc.thoiGianHuy = this.computeThoiGianHuy(
        updateDocumentDto.ngayLuu ?? doc.ngayLuu,
        merged.loaiThoiGian,
        merged.thoiGianLuu,
        updateDocumentDto.thoiGianHuy,
      );
    }
    const saved = await this.documentsRepository.save(doc);
    const diff = this.buildDiff(before, saved);
    if (diff) {
      await this.documentLogsService.log({
        documentId: saved.id,
        soFile: saved.soFile,
        action: HanhDongChungTu.SUA,
        actor: this.actorName(currentUser),
        details: diff.slice(0, 2000),
      });
    }
    return saved;
  }

  /** Đổi vị trí lưu kho (không cần trả về kho) */
  async changeLocation(id: number, dto: ChangeLocationDto, currentUser?: any) {
    const doc = await this.documentsRepository.findOne({ where: { id } });
    if (!doc) throw new NotFoundException(`Chứng từ #${id} không tìm thấy`);
    const oldViTri = doc.viTri;
    doc.viTri = dto.viTri;
    if (dto.ghiChu) {
      doc.ghiChu = dto.ghiChu;
    }
    const saved = await this.documentsRepository.save(doc);
    await this.documentLogsService.log({
      documentId: saved.id,
      soFile: saved.soFile,
      action: HanhDongChungTu.DOI_VI_TRI,
      actor: this.actorName(currentUser),
      details: `Đổi vị trí: '${oldViTri}' → '${dto.viTri}'${dto.ghiChu ? ` (lý do: ${dto.ghiChu})` : ''}`,
    });
    return saved;
  }

  async remove(id: number, currentUser?: any) {
    const doc = await this.documentsRepository.findOne({ where: { id } });
    if (!doc) throw new NotFoundException(`Chứng từ #${id} không tìm thấy`);
    if (doc.trangThai === TrangThaiChungTu.DANG_MUON) {
      throw new ConflictException('Chứng từ đang cho mượn, không thể xóa. Hãy thu hồi trước.');
    }
    const { soFile, tenFile, viTri } = doc;
    await this.documentLogsService.log({
      documentId: doc.id,
      soFile,
      action: HanhDongChungTu.XOA,
      actor: this.actorName(currentUser),
      details: `Xóa chứng từ '${tenFile}' tại ${viTri}`,
    });
    await this.documentsRepository.delete(id);
    return { message: 'Xóa chứng từ thành công' };
  }

  /**
   * Hủy chứng từ hết hạn: chỉ thủ kho bấm khi đã đến hạn hủy
   * (thoiGianHuy <= hôm nay). Xóa khỏi kho + lưu log.
   */
  async destroy(id: number, currentUser?: any) {
    const doc = await this.documentsRepository.findOne({ where: { id } });
    if (!doc) throw new NotFoundException(`Chứng từ #${id} không tìm thấy`);
    if (doc.trangThai === TrangThaiChungTu.DANG_MUON) {
      throw new ConflictException('Chứng từ đang cho mượn, phải thu hồi trước khi hủy.');
    }
    const today = new Date().toISOString().split('T')[0];
    const hanHuy = this.toDateOnly(doc.thoiGianHuy);
    if (!hanHuy || hanHuy > today) {
      throw new BadRequestException(
        `Chứng từ chưa đến hạn hủy${hanHuy ? ` (hạn hủy ${hanHuy})` : ' (vô thời hạn)'}.`,
      );
    }
    const { soFile, tenFile, viTri } = doc;
    await this.documentLogsService.log({
      documentId: doc.id,
      soFile,
      action: HanhDongChungTu.XOA,
      actor: this.actorName(currentUser),
      details: `Hủy chứng từ hết hạn '${tenFile}' tại ${viTri} (hạn hủy ${hanHuy})`,
    });
    await this.documentsRepository.delete(id);
    return { message: 'Hủy chứng từ thành công' };
  }
}
