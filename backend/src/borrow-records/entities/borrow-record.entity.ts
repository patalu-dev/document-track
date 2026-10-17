import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
  Index,
} from 'typeorm';
import { Document } from '../../documents/entities/document.entity';

export enum TrangThaiMuon {
  DANG_MUON = 'dang_muon',
  DA_TRA = 'da_tra',
  QUA_HAN = 'qua_han',
}

@Entity('borrow_records')
@Index(['documentId'])
@Index(['trangThai'])
@Index(['hanTra'])
export class BorrowRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  documentId: number;

  @ManyToOne(() => Document, (d) => d.borrowRecords, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'documentId' })
  document: Document;

  @Column({ length: 100 })
  nguoiMuon: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  donViMuon: string | null;

  @Column({ type: 'date' })
  ngayMuon: string;

  @Column({ type: 'date' })
  hanTra: string;

  @Column({ type: 'date', nullable: true })
  ngayTraThucTe: string | null;

  @Column({ type: 'enum', enum: TrangThaiMuon, default: TrangThaiMuon.DANG_MUON })
  trangThai: TrangThaiMuon;

  @Column({ type: 'text', nullable: true })
  ghiChu: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  createdBy: string | null;

  @Column({ type: 'datetime', nullable: true })
  createdAt: Date;

  @Column({ type: 'datetime', nullable: true })
  updatedAt: Date;

  @BeforeInsert()
  setCreatedAt() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  @BeforeUpdate()
  setUpdatedAt() {
    this.updatedAt = new Date();
  }
}
