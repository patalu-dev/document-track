<script setup lang="ts">
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Plus, Save, Loader2, XCircle, CheckCircle } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { h, ref, watch, computed } from 'vue'
import { toast } from 'vue-sonner';
import { request } from '@/lib/api'
import { LOAI_THOI_GIAN_OPTIONS } from '../lib/excel'

const emit = defineEmits(['success'])
const isOpen = ref(false)
const loading = ref(false)
const showLoading = ref(false)
let loadingTimeout: any = null
const departments = ref<any[]>([])

const form = ref({
  soFile: '', tenFile: '', tenHoSo: '', soLuong: 1,
  ngayLuu: new Date().toISOString().split('T')[0],
  nguoiLuu: '', departmentId: undefined as number | undefined,
  viTri: '', loaiThoiGian: 'nam', thoiGianLuu: 5 as number | undefined,
  ghiChu: '',
})
const errors = ref<Record<string, string>>({})

const showThoiGianLuu = computed(() => form.value.loaiThoiGian !== 'vo_thoi_han')

const fetchDepartments = async () => {
  try {
    const res = await request('/departments/select/all')
    if (res.ok) departments.value = await res.json()
  } catch { /* ignore */ }
}

watch(() => isOpen.value, (v) => {
  if (v) { fetchDepartments(); errors.value = {} }
  if (v && !form.value.ngayLuu) form.value.ngayLuu = new Date().toISOString().split('T')[0]
})

watch(() => form.value.loaiThoiGian, (v) => {
  if (v === 'vo_thoi_han') { form.value.thoiGianLuu = undefined }
  else if (!form.value.thoiGianLuu) form.value.thoiGianLuu = 5
})

const validate = () => {
  errors.value = {}
  if (!form.value.soFile.trim()) errors.value.soFile = 'Số file không được để trống'
  if (!form.value.tenFile.trim()) errors.value.tenFile = 'Tên file không được để trống'
  if (!form.value.tenHoSo.trim()) errors.value.tenHoSo = 'Tên hồ sơ không được để trống'
  if (!form.value.ngayLuu) errors.value.ngayLuu = 'Ngày lưu không được để trống'
  if (!form.value.nguoiLuu.trim()) errors.value.nguoiLuu = 'Người lưu không được để trống'
  if (!form.value.viTri.trim()) errors.value.viTri = 'Vị trí không được để trống'
  if (showThoiGianLuu.value && (!form.value.thoiGianLuu || form.value.thoiGianLuu < 1))
    errors.value.thoiGianLuu = 'Nhập thời gian lưu >= 1'
  return Object.keys(errors.value).length === 0
}

const reset = () => {
  form.value = {
    soFile: '', tenFile: '', tenHoSo: '', soLuong: 1,
    ngayLuu: new Date().toISOString().split('T')[0],
    nguoiLuu: '', departmentId: undefined, viTri: '',
    loaiThoiGian: 'nam', thoiGianLuu: 5, ghiChu: '',
  }
}

const handleSubmit = async () => {
  if (!validate()) return
  loading.value = true
  loadingTimeout = setTimeout(() => { showLoading.value = true }, 1000)
  try {
    const payload: any = {
      soFile: form.value.soFile.trim(),
      tenFile: form.value.tenFile.trim(),
      tenHoSo: form.value.tenHoSo.trim(),
      soLuong: Number(form.value.soLuong) || 1,
      ngayLuu: form.value.ngayLuu,
      nguoiLuu: form.value.nguoiLuu.trim(),
      viTri: form.value.viTri.trim(),
      loaiThoiGian: form.value.loaiThoiGian,
      ghiChu: form.value.ghiChu.trim() || null,
    }
    if (form.value.departmentId) payload.departmentId = Number(form.value.departmentId)
    if (showThoiGianLuu.value) {
      payload.thoiGianLuu = Number(form.value.thoiGianLuu)
    }
    const response = await request(`/documents`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      const e = await response.json()
      throw new Error(Array.isArray(e.message) ? e.message.join('; ') : (e.message || 'Lỗi khi lưu chứng từ'))
    }
    reset()
    isOpen.value = false
    emit('success')
    toast('Thông báo', { description: 'Thêm chứng từ thành công', icon: h(CheckCircle, { class: 'text-green-500 w-5 h-5' }), position: 'top-center' });
  } catch (err: any) {
    toast('Thông báo', { description: err.message, icon: h(XCircle, { class: 'text-red-500 w-5 h-5' }), position: 'top-center' });
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
      <Button class="w-full md:w-auto" @click="isOpen = true"><Plus /> Thêm 1 chứng từ</Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Thêm chứng từ</DialogTitle>
        <DialogDescription>Nhập thông tin chứng từ lưu kho.</DialogDescription>
      </DialogHeader>
      <div class="mt-3 grid gap-4 md:grid-cols-2">
        <div class="grid gap-4 md:col-span-2 md:grid-cols-3">
          <div class="grid gap-2 md:col-span-1">
            <Label>Số file <span class="text-red-500">*</span></Label>
            <Input v-model="form.soFile" placeholder="FILE-2024-001" :disabled="loading" :class="{ 'border-red-500': errors.soFile }" />
            <p v-if="errors.soFile" class="text-[13px] text-red-500">{{ errors.soFile }}</p>
          </div>
          <div class="grid gap-2 md:col-span-2">
            <Label>Tên file <span class="text-red-500">*</span></Label>
            <Input v-model="form.tenFile" placeholder="Tên file" :disabled="loading" :class="{ 'border-red-500': errors.tenFile }" />
            <p v-if="errors.tenFile" class="text-[13px] text-red-500">{{ errors.tenFile }}</p>
          </div>
        </div>
        <div class="grid gap-2">
          <Label>Số lượng</Label>
          <Input v-model.number="form.soLuong" type="number" min="1" :disabled="loading" />
        </div>
        <div class="grid gap-2">
          <Label>Tên hồ sơ <span class="text-red-500">*</span></Label>
          <Input v-model="form.tenHoSo" placeholder="Tên hồ sơ" :disabled="loading" :class="{ 'border-red-500': errors.tenHoSo }" />
          <p v-if="errors.tenHoSo" class="text-[13px] text-red-500">{{ errors.tenHoSo }}</p>
        </div>
        <div class="grid gap-2">
          <Label>Ngày lưu <span class="text-red-500">*</span></Label>
          <Input v-model="form.ngayLuu" type="date" :disabled="loading" :class="{ 'border-red-500': errors.ngayLuu }" />
          <p v-if="errors.ngayLuu" class="text-[13px] text-red-500">{{ errors.ngayLuu }}</p>
        </div>
        <div class="grid gap-2">
          <Label>Người lưu <span class="text-red-500">*</span></Label>
          <Input v-model="form.nguoiLuu" placeholder="Người lưu" :disabled="loading" :class="{ 'border-red-500': errors.nguoiLuu }" />
          <p v-if="errors.nguoiLuu" class="text-[13px] text-red-500">{{ errors.nguoiLuu }}</p>
        </div>
        <div class="grid gap-2">
          <Label>Bộ phận</Label>
          <Select v-model="form.departmentId">
            <SelectTrigger class="w-full"><SelectValue placeholder="Chọn bộ phận" /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div class="grid gap-2">
          <Label>Vị trí <span class="text-red-500">*</span></Label>
          <Input v-model="form.viTri" placeholder="Kệ A1 - Ngăn 3" :disabled="loading" :class="{ 'border-red-500': errors.viTri }" />
          <p v-if="errors.viTri" class="text-[13px] text-red-500">{{ errors.viTri }}</p>
        </div>
        <div class="grid gap-2">
          <Label>Loại thời gian</Label>
          <Select v-model="form.loaiThoiGian">
            <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem v-for="o in LOAI_THOI_GIAN_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div class="grid gap-2" v-if="showThoiGianLuu">
          <Label>Thời gian lưu (số tháng/năm) <span class="text-red-500">*</span></Label>
          <Input v-model.number="form.thoiGianLuu" type="number" min="1" :disabled="loading" :class="{ 'border-red-500': errors.thoiGianLuu }" />
          <p v-if="errors.thoiGianLuu" class="text-[13px] text-red-500">{{ errors.thoiGianLuu }}</p>
        </div>
        <div class="grid gap-2 md:col-span-2">
          <Label>Ghi chú</Label>
          <Textarea v-model="form.ghiChu" placeholder="Ghi chú thêm..." :disabled="loading" />
        </div>
      </div>
      <DialogFooter>
        <Button class="mt-3" @click="handleSubmit" :disabled="loading">
          <template v-if="showLoading"><Loader2 class="animate-spin" /> Đang lưu...</template>
          <template v-else><Save /> Lưu</template>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
