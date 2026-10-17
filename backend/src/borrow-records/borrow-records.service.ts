import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BorrowRecord, TrangThaiMuon } from './entities/borrow-record.entity';
import { BorrowDocumentDto, ReturnDocumentDto } from './dto/borrow-record.dto';
import { Document, TrangThaiChungTu } from '../documents/entities/document.entity';
import { applyKeywordSearch } from '../utils/search';
import { DocumentLogsService } from '../document-logs/document-logs.service';
import { HanhDongChungTu } from '../document-logs/entities/document-log.entity';

@Injectable()
export class BorrowRecordsService {
  constructor(
    @InjectRepository(BorrowRecord)
    private borrowRepository: Repository<BorrowRecord>,
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
    private documentLogsService: DocumentLogsService,
  ) {}

  private actorName(currentUser?: any): string | null {
    if (!currentUser) return null;
    return (
      currentUser?.name ?? currentUser?.username ?? String(currentUser?.id ?? '')
    ).slice(0, 100) || null;
  }

  /** Cho mượn chứng từ */
  async borrow(dto: BorrowDocumentDto, currentUser?: any) {
    const doc = await this.documentsRepository.findOne({
      where: { id: dto.documentId },
    });
    if (!doc) throw new NotFoundException(`Chứng từ #${dto.documentId} không tìm thấy`);
    if (doc.trangThai === TrangThaiChungTu.DANG_MUON) {
      throw new ConflictException('Chứng từ đang cho mượn, phải thu hồi trước khi cho mượn tiếp');
    }
    if (new Date(dto.hanTra) < new Date(dto.ngayMuon)) {
      throw new BadRequestException('Hạn trả phải sau ngày mượn');
    }

    const record = this.borrowRepository.create({
      documentId: dto.documentId,
      nguoiMuon: dto.nguoiMuon,
      donViMuon: dto.donViMuon ?? null,
      ngayMuon: dto.ngayMuon,
      hanTra: dto.hanTra,
      ghiChu: dto.ghiChu ?? null,
      trangThai: TrangThaiMuon.DANG_MUON,
      createdBy: this.actorName(currentUser),
    });
    const saved = await this.borrowRepository.save(record);

    doc.trangThai = TrangThaiChungTu.DANG_MUON;
    await this.documentsRepository.save(doc);
    await this.documentLogsService.log({
      documentId: doc.id,
      soFile: doc.soFile,
      action: HanhDongChungTu.MUON,
      actor: this.actorName(currentUser),
      details: `Cho mượn: ${dto.nguoiMuon}${dto.donViMuon ? ` (${dto.donViMuon})` : ''}, ngày mượn ${dto.ngayMuon}, hạn trả ${dto.hanTra}`,
    });
    return saved;
  }

  /** Thu hồi / trả chứng từ */
  async returnOne(id: number, dto: ReturnDocumentDto, currentUser?: any) {
    const record = await this.borrowRepository.findOne({
      where: { id },
      relations: ['document'],
    });
    if (!record) throw new NotFoundException(`Phiếu mượn #${id} không tìm thấy`);
    if (record.trangThai === TrangThaiMuon.DA_TRA) {
      throw new ConflictException('Phiếu mượn này đã được trả');
    }

    const ngayTra = dto.ngayTraThucTe ?? new Date().toISOString().split('T')[0];
    record.ngayTraThucTe = ngayTra;
    record.trangThai = TrangThaiMuon.DA_TRA;
    if (dto.ghiChu) record.ghiChu = dto.ghiChu;
    await this.borrowRepository.save(record);

    // Trả chứng từ về kho (nếu chưa bị hủy)
    const doc = await this.documentsRepository.findOne({ where: { id: record.documentId } });
    if (doc && doc.trangThai === TrangThaiChungTu.DANG_MUON) {
      // Chỉ về kho khi không còn phiếu đang mượn nào khác
      const dangMuonKhac = await this.borrowRepository.count({
        where: { documentId: doc.id, trangThai: TrangThaiMuon.DANG_MUON },
      });
      if (dangMuonKhac === 0) {
        doc.trangThai = TrangThaiChungTu.LUU_KHO;
        await this.documentsRepository.save(doc);
      }
    }
    await this.documentLogsService.log({
      documentId: record.documentId,
      soFile: record.document?.soFile ?? doc?.soFile ?? null,
      action: HanhDongChungTu.TRA,
      actor: this.actorName(currentUser),
      details: `Thu hồi từ ${record.nguoiMuon}, ngày trả ${ngayTra}`,
    });
    return record;
  }

  async findAll(query?: {
    documentId?: number;
    trangThai?: string;
    keyword?: string;
    quaHan?: string;
    order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    const rawPage = Number((query as any)?.page ?? 1);
    const rawLimit = Number((query as any)?.limit ?? 10);
    const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
    const limit = Number.isFinite(rawLimit)
      ? Math.min(100, Math.max(1, Math.floor(rawLimit)))
      : 10;
    const skip = (page - 1) * limit;

    const qb = this.borrowRepository
      .createQueryBuilder('br')
      .leftJoinAndSelect('br.document', 'doc');

    if (query?.documentId) {
      qb.andWhere('br.documentId = :docId', { docId: Number(query.documentId) });
    }
    if (query?.trangThai) {
      qb.andWhere('br.trangThai = :tt', { tt: query.trangThai });
    }
    if (query?.keyword) {
      applyKeywordSearch(
        qb,
        ['br.nguoiMuon', 'doc.soFile', 'doc.tenFile'],
        query.keyword,
        'kw',
      );
    }
    if (query?.quaHan === 'true') {
      const today = new Date().toISOString().split('T')[0];
      qb.andWhere('br.trangThai = :dangMuon', { dangMuon: TrangThaiMuon.DANG_MUON }).andWhere(
        'br.hanTra < :today',
        { today },
      );
    }

    const [items, total] = await qb
      .orderBy('br.id', query?.order === 'asc' ? 'ASC' : 'DESC')
      .take(limit)
      .skip(skip)
      .getManyAndCount();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number) {
    const record = await this.borrowRepository.findOne({
      where: { id },
      relations: ['document'],
    });
    if (!record) throw new NotFoundException(`Phiếu mượn #${id} không tìm thấy`);
    return record;
  }
}
