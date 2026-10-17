export const LOG_ACTION_OPTIONS = [
  { value: 'them', label: 'Thêm' },
  { value: 'sua', label: 'Sửa' },
  { value: 'xoa', label: 'Xóa' },
  { value: 'doi_vi_tri', label: 'Đổi vị trí' },
  { value: 'muon', label: 'Cho mượn' },
  { value: 'tra', label: 'Trả' },
]

export function logActionLabel(v: string) {
  return LOG_ACTION_OPTIONS.find((o) => o.value === v)?.label ?? v
}

export function logActionVariant(v: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (v) {
    case 'them':
    case 'muon':
      return 'default'
    case 'xoa':
      return 'destructive'
    case 'doi_vi_tri':
      return 'outline'
    default:
      return 'secondary'
  }
}
