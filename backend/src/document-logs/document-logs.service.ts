import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentLog, HanhDongChungTu } from './entities/document-log.entity';
import { applyKeywordSearch } from '../utils/search';

export interface LogEntry {
  documentId?: number | null;
  soFile?: string | null;
  action: HanhDongChungTu;
  actor?: string | null;
  details?: string | null;
}

@Injectable()
export class DocumentLogsService {
  constructor(
    @InjectRepository(DocumentLog)
    private logsRepository: Repository<DocumentLog>,
  ) {}

  /** Ghi log. Nuốt lỗi để logging không bao giờ làm hỏng nghiệp vụ chính. */
  async log(entry: LogEntry): Promise<void> {
    try {
      await this.logsRepository.save(
        this.logsRepository.create({
          documentId: entry.documentId ?? null,
          soFile: entry.soFile ?? null,
          action: entry.action,
          actor: entry.actor ?? null,
          details: entry.details ?? null,
        }),
      );
    } catch {
      /* ignore */
    }
  }

  async findAll(query?: {
    documentId?: number;
    action?: string;
    keyword?: string;
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

    const qb = this.logsRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.document', 'doc');

    if (query?.documentId) {
      qb.andWhere('log.documentId = :docId', { docId: Number(query.documentId) });
    }
    if (query?.action) {
      qb.andWhere('log.action = :action', { action: query.action });
    }
    if (query?.keyword) {
      applyKeywordSearch(qb, ['log.soFile', 'log.actor', 'log.details'], query.keyword, 'logkw');
    }

    const [items, total] = await qb
      .orderBy('log.id', query?.order === 'asc' ? 'ASC' : 'DESC')
      .take(limit)
      .skip(skip)
      .getManyAndCount();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
