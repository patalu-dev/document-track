import * as XLSX from 'xlsx'
import { request } from '@/lib/api'

export const DOCUMENT_TEMPLATE_HEADERS = [
  'so_file',
  'ten_file',
  'ten_ho_so',
  'so_luong',
  'ngay_luu',
  'nguoi_luu',
  'department_id',
  'vi_tri',
  'loai_thoi_gian',
  'thoi_gian_luu',
  'ghi_chu',
]

export const DOCUMENT_TEMPLATE_SAMPLE = [
  {
    so_file: 'FILE-2024-001',
    ten_file: 'File hồ sơ lương T1',
    ten_ho_so: 'Bảng lương tháng 01/2024',
    so_luong: 1,
    ngay_luu: '2024-01-15',
    nguoi_luu: 'Nguyễn Văn A',
    department_id: 1,
    vi_tri: 'Kệ A1 - Ngăn 3',
    loai_thoi_gian: 'nam',
    thoi_gian_luu: 5,
    ghi_chu: 'Lưu 5 năm',
  },
]

export function downloadDocumentTemplate() {
  const ws = XLSX.utils.json_to_sheet(DOCUMENT_TEMPLATE_SAMPLE, { header: DOCUMENT_TEMPLATE_HEADERS })
  ws['!cols'] = DOCUMENT_TEMPLATE_HEADERS.map(() => ({ wch: 20 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'ChungTu')
  // Sheet hướng dẫn
  const guide = [
    { Truong: 'so_file', 'Bắt buộc': 'Có', 'Ghi chú': 'Mã số file, VD: FILE-2024-001' },
    { Truong: 'ten_file', 'Bắt buộc': 'Có', 'Ghi chú': 'Tên file' },
    { Truong: 'ten_ho_so', 'Bắt buộc': 'Có', 'Ghi chú': 'Tên hồ sơ' },
    { Truong: 'so_luong', 'Bắt buộc': 'Không', 'Ghi chú': 'Mặc định 1' },
    { Truong: 'ngay_luu', 'Bắt buộc': 'Có', 'Ghi chú': 'YYYY-MM-DD' },
    { Truong: 'nguoi_luu', 'Bắt buộc': 'Có', 'Ghi chú': 'Người lưu kho' },
    { Truong: 'department_id', 'Bắt buộc': 'Không', 'Ghi chú': 'ID bộ phận (xem ở menu Bộ phận)' },
    { Truong: 'vi_tri', 'Bắt buộc': 'Có', 'Ghi chú': 'VD: Kệ A1 - Ngăn 3' },
    { Truong: 'loai_thoi_gian', 'Bắt buộc': 'Không', 'Ghi chú': 'thang | nam | vo_thoi_han (mặc định nam)' },
    { Truong: 'thoi_gian_luu', 'Bắt buộc': 'Có nếu tháng/năm', 'Ghi chú': 'Số tháng/năm, VD: 5' },
    { Truong: 'ghi_chu', 'Bắt buộc': 'Không', 'Ghi chú': 'Ghi chú thêm' },
  ]
  const ws2 = XLSX.utils.json_to_sheet(guide)
  ws2['!cols'] = [{ wch: 16 }, { wch: 18 }, { wch: 50 }]
  XLSX.utils.book_append_sheet(wb, ws2, 'HuongDan')
  XLSX.writeFile(wb, 'Mau-import-chung-tu.xlsx')
}

function excelDateToISO(v: any): string {
  if (v === null || v === undefined || v === '') return ''
  if (typeof v === 'number') {
    // Excel serial date
    const d = XLSX.SSF ? XLSX.SSF.parse_date_code(v) : null
    if (d) {
      const mm = String(d.m).padStart(2, '0')
      const dd = String(d.d).padStart(2, '0')
      return `${d.y}-${mm}-${dd}`
    }
  }
  const s = String(v).trim()
  // dd/mm/yyyy -> yyyy-mm-dd
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return s.slice(0, 10)
}

export async function parseDocumentExcel(file: File): Promise<any[]> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const sheetName = wb.SheetNames.includes('ChungTu') ? 'ChungTu' : wb.SheetNames[0]
  const ws = wb.Sheets[sheetName]
  const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
  return rows.map((r: any) => {
    const loaiRaw = String(r.loai_thoi_gian || r.loaiThoiGian || 'nam').trim().toLowerCase()
    const loai = ['thang', 'nam', 'vo_thoi_han'].includes(loaiRaw) ? loaiRaw : 'nam'
    // Chuẩn hoá "vô thời hạn" tiếng Việt
    const isVoThoiHan = /vô|vo_thoi_han|voth |không thời hạn/i.test(String(r.loai_thoi_gian || ''))
    return {
      soFile: String(r.so_file ?? r.soFile ?? '').trim(),
      tenFile: String(r.ten_file ?? r.tenFile ?? '').trim(),
      tenHoSo: String(r.ten_ho_so ?? r.tenHoSo ?? '').trim(),
      soLuong: Number(r.so_luong ?? r.soLuong ?? 1) || 1,
      ngayLuu: excelDateToISO(r.ngay_luu ?? r.ngayLuu ?? ''),
      nguoiLuu: String(r.nguoi_luu ?? r.nguoiLuu ?? '').trim(),
      departmentId: r.department_id || r.departmentId || r.bo_phan_id ? Number(r.department_id ?? r.departmentId ?? r.bo_phan_id) : undefined,
      viTri: String(r.vi_tri ?? r.viTri ?? '').trim(),
      loaiThoiGian: isVoThoiHan ? 'vo_thoi_han' : loai,
      thoiGianLuu: r.thoi_gian_luu || r.thoiGianLuu ? Number(r.thoi_gian_luu ?? r.thoiGianLuu) : null,
      // Ngày hủy do hệ thống tự tính = ngày lưu + thời gian lưu (bỏ qua cột thoi_gian_huy nếu file cũ còn)
      ghiChu: String(r.ghi_chu ?? r.ghiChu ?? '').trim() || null,
    }
  }).filter((r) => r.soFile || r.tenFile || r.tenHoSo)
}

export async function exportDocuments(filters: any) {
  const { toast } = await import('vue-sonner')
  const toastId = toast.loading('Đang chuẩn bị dữ liệu xuất...', { position: 'top-center' })
  try {
    const queryParams = new URLSearchParams()
    if (filters.keyword) queryParams.append('keyword', filters.keyword)
    if (filters.departmentId) queryParams.append('departmentId', String(filters.departmentId))
    if (filters.viTri) queryParams.append('viTri', filters.viTri)
    if (filters.ngayLuuTu) queryParams.append('ngayLuuTu', filters.ngayLuuTu)
    if (filters.ngayLuuDen) queryParams.append('ngayLuuDen', filters.ngayLuuDen)
    const response = await request(`/documents/export?${queryParams.toString()}`)
    if (!response.ok) throw new Error('Không thể lấy dữ liệu xuất')
    const result = await response.json()
    const data = result.items || []
    if (data.length === 0) { toast.error('Không có dữ liệu để xuất', { id: toastId }); return }
    const rows = data.map((d: any, i: number) => ({
      STT: i + 1,
      so_file: d.soFile,
      ten_file: d.tenFile,
      ten_ho_so: d.tenHoSo,
      so_luong: d.soLuong,
      ngay_luu: d.ngayLuu?.slice(0, 10),
      nguoi_luu: d.nguoiLuu,
      bo_phan: d.department?.name || '',
      vi_tri: d.viTri,
      loai_thoi_gian: d.loaiThoiGian,
      thoi_gian_luu: d.thoiGianLuu ?? '',
      thoi_gian_huy: d.thoiGianHuy?.slice(0, 10) || '',
      trang_thai: d.trangThai,
      ghi_chu: d.ghiChu || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = Object.keys(rows[0]).map(() => ({ wch: 20 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'ChungTu')
    const dateStr = new Date().toISOString().split('T')[0]
    XLSX.writeFile(wb, `Danh-sach-chung-tu-${dateStr}.xlsx`)
    toast.success('Xuất file thành công', { id: toastId })
  } catch (err) {
    toast.error('Lỗi khi xuất file, vui lòng thử lại', { id: toastId })
  }
}

export const LOAI_THOI_GIAN_OPTIONS = [
  { value: 'thang', label: 'Tháng' },
  { value: 'nam', label: 'Năm' },
  { value: 'vo_thoi_han', label: 'Vô thời hạn' },
]

export const TRANG_THAI_OPTIONS = [
  { value: 'luu_kho', label: 'Lưu kho' },
  { value: 'dang_muon', label: 'Đang mượn' },
]

export function trangThaiLabel(v: string) {
  return TRANG_THAI_OPTIONS.find((o) => o.value === v)?.label ?? v
}

export function loaiThoiGianLabel(v: string) {
  return LOAI_THOI_GIAN_OPTIONS.find((o) => o.value === v)?.label ?? v
}
