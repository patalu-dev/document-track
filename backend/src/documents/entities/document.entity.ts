import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
  Index,
} from 'typeorm';
import { Department } from '../../departments/entities/department.entity';
import { BorrowRecord } from '../../borrow-records/entities/borrow-record.entity';

export enum LoaiThoiGian {
  THANG = 'thang',
  NAM = 'nam',
  VO_THOI_HAN = 'vo_thoi_han',
}

export enum TrangThaiChungTu {
  LUU_KHO = 'luu_kho',
  DANG_MUON = 'dang_muon',
}

@Entity('documents')
@Index(['soFile'])
@Index(['tenFile'])
@Index(['tenHoSo'])
@Index(['departmentId'])
@Index(['trangThai'])
@Index(['thoiGianHuy'])
export class Document {
  @PrimaryGeneratedColumn()
  id: number;

  // Số file (VD: FILE-2024-001)
  @Column({ type: 'varchar', length: 100 })
  soFile: string;

  // Tên file
  @Column({ length: 255 })
  tenFile: string;

  // Tên hồ sơ (có thể trống)
  @Column({ type: 'varchar', length: 255, nullable: true })
  tenHoSo: string | null;

  @Column({ type: 'int', default: 1 })
  soLuong: number;

  @Column({ type: 'date' })
  ngayLuu: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  nguoiLuu: string | null;

  @Column({ type: 'int', nullable: true })
  departmentId: number;

  @ManyToOne(() => Department, { onDelete: 'RESTRICT', eager: false, nullable: true })
  @JoinColumn({ name: 'departmentId' })
  department: Department;

  // Vị trí lưu kho: text tự do VD "Kệ A1 - Ngăn 3"
  @Column({ length: 255 })
  viTri: string;

  @Column({ type: 'enum', enum: LoaiThoiGian, default: LoaiThoiGian.NAM })
  loaiThoiGian: LoaiThoiGian;

  // Số tháng/năm lưu (null khi vô thời hạn)
  @Column({ type: 'int', nullable: true })
  thoiGianLuu: number | null;

  // Ngày hủy (tự tính = ngayLuu + thoiGianLuu, null khi vô thời hạn)
  @Column({ type: 'date', nullable: true })
  thoiGianHuy: string | null;

  @Column({ type: 'text', nullable: true })
  ghiChu: string | null;

  @Column({
    type: 'enum',
    enum: TrangThaiChungTu,
    default: TrangThaiChungTu.LUU_KHO,
  })
  trangThai: TrangThaiChungTu;

  @Column({ type: 'varchar', length: 100, nullable: true })
  createdBy: string | null;

  @OneToMany(() => BorrowRecord, (br) => br.document)
  borrowRecords: BorrowRecord[];

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
