import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  Index,
} from 'typeorm';
import { Document } from '../../documents/entities/document.entity';

export enum HanhDongChungTu {
  THEM = 'them',
  SUA = 'sua',
  XOA = 'xoa',
  DOI_VI_TRI = 'doi_vi_tri',
  MUON = 'muon',
  TRA = 'tra',
}

@Entity('document_logs')
@Index(['documentId'])
@Index(['action'])
@Index(['createdAt'])
export class DocumentLog {
  @PrimaryGeneratedColumn()
  id: number;

  // Nullable + SET NULL: xóa chứng từ vẫn giữ lại log (tra cứu qua soFile)
  @Column({ type: 'int', nullable: true })
  documentId: number | null;

  @ManyToOne(() => Document, { onDelete: 'SET NULL', eager: false, nullable: true })
  @JoinColumn({ name: 'documentId' })
  document: Document;

  // Snapshot mã file để đọc log sau khi chứng từ bị xóa
  @Column({ type: 'varchar', length: 100, nullable: true })
  soFile: string | null;

  @Column({ type: 'enum', enum: HanhDongChungTu })
  action: HanhDongChungTu;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  actor: string | null;

  @Column({ type: 'datetime', nullable: true })
  createdAt: Date;

  @BeforeInsert()
  setCreatedAt() {
    this.createdAt = new Date();
  }
}
