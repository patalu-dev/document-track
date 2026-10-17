<script setup lang="ts">
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Save, Loader2, XCircle, CheckCircle, Edit } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { h, ref, watch, computed } from 'vue'
import { toast } from 'vue-sonner';
import { request } from '@/lib/api'
import { LOAI_THOI_GIAN_OPTIONS } from '../lib/excel'

const props = defineProps({ document: { type: Object, required: true } })
const emit = defineEmits(['success'])
const isOpen = ref(false)
const loading = ref(false)
const showLoading = ref(false)
let loadingTimeout: any = null
const departments = ref<any[]>([])
const form = ref<any>({})
const errors = ref<Record<string, string>>({})

const showThoiGianLuu = computed(() => form.value.loaiThoiGian !== 'vo_thoi_han')

const fetchDepartments = async () => {
  try {
    const res = await request('/departments/select/all')
    if (res.ok) departments.value = await res.json()
  } catch { /* ignore */ }
}

watch(() => isOpen.value, (v) => {
  if (v) {
    fetchDepartments()
    const d = props.document
    form.value = {
      soFile: d.soFile, tenFile: d.tenFile, tenHoSo: d.tenHoSo, soLuong: d.soLuong,
      ngayLuu: d.ngayLuu?.slice(0, 10), nguoiLuu: d.nguoiLuu,
      departmentId: d.departmentId ?? d.department?.id ?? undefined,
      viTri: d.viTri, loaiThoiGian: d.loaiThoiGian,
      thoiGianLuu: d.thoiGianLuu,
      ghiChu: d.ghiChu || '', trangThai: d.trangThai,
    }
    errors.value = {}
  }
})

const handleSubmit = async () => {
  errors.value = {}
  if (!form.value.soFile?.trim()) errors.value.soFile = 'Số file không được để trống'
  if (!form.value.tenFile?.trim()) errors.value.tenFile = 'Tên file không được để trống'
  if (Object.keys(errors.value).length > 0) return
  loading.value = true
  loadingTimeout = setTimeout(() => { showLoading.value = true }, 1000)
  try {
    const payload: any = {
      soFile: form.value.soFile?.trim(),
      tenFile: form.value.tenFile?.trim(),
      tenHoSo: form.value.tenHoSo?.trim(),
      soLuong: Number(form.value.soLuong) || 1,
      ngayLuu: form.value.ngayLuu,
      nguoiLuu: form.value.nguoiLuu?.trim(),
      viTri: form.value.viTri?.trim(),
      loaiThoiGian: form.value.loaiThoiGian,
      ghiChu: form.value.ghiChu?.trim() || null,
    }
    if (form.value.departmentId) payload.departmentId = Number(form.value.departmentId)
    if (form.value.loaiThoiGian === 'vo_thoi_han') { payload.thoiGianLuu = null }
    else {
      payload.thoiGianLuu = form.value.thoiGianLuu ? Number(form.value.thoiGianLuu) : null
    }
    const response = await request(`/documents/${props.document.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const e = await response.json()
      throw new Error(Array.isArray(e.message) ? e.message.join('; ') : (e.message || 'Lỗi khi cập nhật'))
    }
    isOpen.value = false
    emit('success')
    toast('Thông báo', { description: 'Cập nhật chứng từ thành công', icon: h(CheckCircle, { class: 'text-green-500 w-5 h-5' }), position: 'top-center' });
  } catch (err: any) {
    toast('Lỗi', { description: err.message, icon: h(XCircle, { class: 'text-red-500 w-5 h-5' }), position: 'top-center' });
  } finally {
    if (loadingTimeout) clearTimeout(loadingTimeout)
    loading.value = false
    showLoading.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogTrigger as-child>
      <Button variant="outline" size="icon-sm" class="hover:bg-gray-100" title="Sửa"><Edit class="w-4 h-4" /></Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Sửa chứng từ {{ document.soFile }}</DialogTitle>
        <DialogDescription>Điều chỉnh thông tin rồi nhấn lưu.</DialogDescription>
      </DialogHeader>
      <div class="mt-3 grid gap-4 md:grid-cols-2">
        <div class="grid gap-2">
          <Label>Số file <span class="text-red-500">*</span></Label>
          <Input v-model="form.soFile" :disabled="loading" :class="{ 'border-red-500': errors.soFile }" />
          <p v-if="errors.soFile" class="text-[13px] text-red-500">{{ errors.soFile }}</p>
        </div>
        <div class="grid gap-2">
          <Label>Số lượng</Label>
          <Input v-model.number="form.soLuong" type="number" min="1" :disabled="loading" />
        </div>
        <div class="grid gap-2 md:col-span-2">
          <Label>Tên file <span class="text-red-500">*</span></Label>
          <Input v-model="form.tenFile" :disabled="loading" />
        </div>
        <div class="grid gap-2 md:col-span-2">
          <Label>Tên hồ sơ</Label>
          <Input v-model="form.tenHoSo" :disabled="loading" placeholder="Nhập tên hồ sơ" />
        </div>
        <div class="grid gap-2">
          <Label>Ngày lưu</Label>
          <Input v-model="form.ngayLuu" type="date" :disabled="loading" />
        </div>
        <div class="grid gap-2">
          <Label>Người lưu</Label>
          <Input v-model="form.nguoiLuu" :disabled="loading" />
        </div>
        <div class="grid gap-2">
          <Label>Bộ phận</Label>
          <Select v-model="form.departmentId">
            <SelectTrigger class="w-full"><SelectValue placeholder="Chọn bộ phận" /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</SelectItem>
            </SelectGroup></SelectContent>
          </Select>
        </div>
        <div class="grid gap-2">
          <Label>Vị trí</Label>
          <Input v-model="form.viTri" :disabled="loading" />
        </div>
        <div class="grid gap-2">
          <Label>Loại thời gian</Label>
          <Select v-model="form.loaiThoiGian">
            <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem v-for="o in LOAI_THOI_GIAN_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</SelectItem>
            </SelectGroup></SelectContent>
          </Select>
        </div>
        <div class="grid gap-2" v-if="showThoiGianLuu">
          <Label>Thời gian lưu</Label>
          <Input v-model.number="form.thoiGianLuu" type="number" min="1" :disabled="loading" />
        </div>
        <div class="grid gap-2 md:col-span-2">
          <Label>Ghi chú</Label>
          <Textarea v-model="form.ghiChu" :disabled="loading" />
        </div>
      </div>
      <DialogFooter>
        <Button class="mt-3" @click="handleSubmit" :disabled="loading">
          <template v-if="showLoading"><Loader2 class="animate-spin mr-2 h-4 w-4" /> Đang lưu...</template>
          <template v-else><Save class="mr-2 h-4 w-4" /> Lưu thay đổi</template>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
