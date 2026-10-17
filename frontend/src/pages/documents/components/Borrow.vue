<script setup lang="ts">
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, XCircle, CheckCircle, HandHelping } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { h, ref, watch } from 'vue'
import { toast } from 'vue-sonner';
import { request } from '@/lib/api'

const props = defineProps({ document: { type: Object, required: true } })
const emit = defineEmits(['success'])
const isOpen = ref(false)
const loading = ref(false)
const departments = ref<any[]>([])
const form = ref({
  nguoiMuon: '', donViMuon: '',
  ngayMuon: new Date().toISOString().split('T')[0],
  hanTra: '', ghiChu: '',
})
const error = ref('')

watch(() => isOpen.value, (v) => {
  if (v) {
    const d = new Date(); d.setDate(d.getDate() + 7)
    form.value = { nguoiMuon: '', donViMuon: '', ngayMuon: new Date().toISOString().split('T')[0], hanTra: d.toISOString().split('T')[0], ghiChu: '' }
    error.value = ''
    request('/departments/select/all').then(async (res) => {
      if (res.ok) departments.value = await res.json()
    })
  }
})

const handleSubmit = async () => {
  error.value = ''
  if (!form.value.nguoiMuon.trim()) { error.value = 'Người mượn không được để trống'; return }
  if (!form.value.ngayMuon || !form.value.hanTra) { error.value = 'Nhập đầy đủ ngày mượn và hạn trả'; return }
  if (form.value.hanTra < form.value.ngayMuon) { error.value = 'Hạn trả phải sau ngày mượn'; return }
  loading.value = true
  try {
    const res = await request('/borrow-records/borrow', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId: props.document.id,
        nguoiMuon: form.value.nguoiMuon.trim(),
        donViMuon: departments.value.find((d) => String(d.id) === form.value.donViMuon)?.name ?? null,
        ngayMuon: form.value.ngayMuon,
        hanTra: form.value.hanTra,
        ghiChu: form.value.ghiChu.trim() || null,
      }),
    })
    if (!res.ok) {
      const e = await res.json()
      throw new Error(Array.isArray(e.message) ? e.message.join('; ') : (e.message || 'Lỗi khi cho mượn'))
    }
    isOpen.value = false
    emit('success')
    toast('Thông báo', { description: 'Cho mượn thành công', icon: h(CheckCircle, { class: 'text-green-500 w-5 h-5' }), position: 'top-center' });
  } catch (err: any) {
    toast('Lỗi', { description: err.message, icon: h(XCircle, { class: 'text-red-500 w-5 h-5' }), position: 'top-center' });
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogTrigger as-child>
      <Button variant="outline" size="icon-sm" class="hover:bg-gray-100" title="Cho mượn" :disabled="document.trangThai !== 'luu_kho'">
        <HandHelping class="w-4 h-4" />
      </Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Cho mượn chứng từ</DialogTitle>
        <DialogDescription>{{ document.soFile }} — {{ document.tenFile }}</DialogDescription>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid gap-2">
          <Label>Người mượn <span class="text-red-500">*</span></Label>
          <Input v-model="form.nguoiMuon" placeholder="Tên người mượn" :disabled="loading" />
        </div>
        <div class="grid gap-2">
          <Label>Đơn vị mượn</Label>
          <Select v-model="form.donViMuon">
            <SelectTrigger :disabled="loading" class="w-full"><SelectValue placeholder="Chọn phòng/ban" /></SelectTrigger>
            <SelectContent><SelectGroup>
              <SelectItem v-for="d in departments" :key="d.id" :value="String(d.id)">{{ d.name }}</SelectItem>
            </SelectGroup></SelectContent>
          </Select>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="grid gap-2">
            <Label>Ngày mượn <span class="text-red-500">*</span></Label>
            <Input v-model="form.ngayMuon" type="date" :disabled="loading" />
          </div>
          <div class="grid gap-2">
            <Label>Hạn trả <span class="text-red-500">*</span></Label>
            <Input v-model="form.hanTra" type="date" :disabled="loading" />
          </div>
        </div>
        <div class="grid gap-2">
          <Label>Ghi chú</Label>
          <Textarea v-model="form.ghiChu" :disabled="loading" />
        </div>
        <p v-if="error" class="text-[13px] text-red-500">{{ error }}</p>
      </div>
      <DialogFooter>
        <Button @click="handleSubmit" :disabled="loading">
          <template v-if="loading"><Loader2 class="animate-spin mr-2 h-4 w-4" /> Đang lưu...</template>
          <template v-else><HandHelping class="mr-2 h-4 w-4" /> Cho mượn</template>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
