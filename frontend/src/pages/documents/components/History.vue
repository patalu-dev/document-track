<script setup lang="ts">
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, XCircle, CheckCircle, History, Undo2 } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { h, ref, watch } from 'vue'
import { toast } from 'vue-sonner';
import { request } from '@/lib/api'

const props = defineProps({ document: { type: Object, required: true } })
const emit = defineEmits(['success'])
const isOpen = ref(false)
const loading = ref(false)
const records = ref<any[]>([])
const returnDate = ref(new Date().toISOString().split('T')[0])
const returningId = ref<number | null>(null)

const fetchHistory = async () => {
  loading.value = true
  try {
    const res = await request(`/borrow-records?documentId=${props.document.id}&order=asc&limit=50`)
    if (!res.ok) throw new Error('Không tải được lịch sử mượn')
    const data = await res.json()
    records.value = data.items || []
  } catch (err: any) {
    toast('Lỗi', { description: err.message, icon: h(XCircle, { class: 'text-red-500 w-5 h-5' }), position: 'top-center' })
  } finally {
    loading.value = false
  }
}

watch(() => isOpen.value, (v) => { if (v) fetchHistory() })

const handleReturn = async (id: number) => {
  returningId.value = id
  try {
    const res = await request(`/borrow-records/${id}/return`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ngayTraThucTe: returnDate.value }),
    })
    if (!res.ok) {
      const e = await res.json()
      throw new Error(e.message || 'Lỗi khi trả chứng từ')
    }
    toast('Thông báo', { description: 'Trả chứng từ thành công', icon: h(CheckCircle, { class: 'text-green-500 w-5 h-5' }), position: 'top-center' })
    await fetchHistory()
    emit('success')
  } catch (err: any) {
    toast('Lỗi', { description: err.message, icon: h(XCircle, { class: 'text-red-500 w-5 h-5' }), position: 'top-center' })
  } finally {
    returningId.value = null
  }
}

const statusLabel = (r: any) => {
  if (r.trangThai === 'da_tra') return 'Đã trả'
  if (r.hanTra?.slice(0, 10) < new Date().toISOString().split('T')[0]) return 'Quá hạn'
  return 'Đang mượn'
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogTrigger as-child>
      <Button variant="outline" size="icon-sm" class="hover:bg-gray-100" title="Lịch sử mượn / Trả"><History class="w-4 h-4" /></Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Lịch sử mượn — trả</DialogTitle>
        <DialogDescription>{{ document.soFile }} — {{ document.tenFile }}</DialogDescription>
      </DialogHeader>
      <div class="mt-2 flex items-end gap-2">
        <div class="grid gap-1">
          <Label class="text-xs">Ngày trả thực tế</Label>
          <Input v-model="returnDate" type="date" class="h-8" />
        </div>
      </div>
      <div class="mt-3 border rounded-lg overflow-x-auto">
        <table class="min-w-full text-xs text-left divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-2 py-1">Người mượn</th>
              <th class="px-2 py-1">Ngày mượn</th>
              <th class="px-2 py-1">Hạn trả</th>
              <th class="px-2 py-1">Ngày trả</th>
              <th class="px-2 py-1">Trạng thái</th>
              <th class="px-2 py-1"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="loading"><td colspan="6" class="px-2 py-6 text-center"><Loader2 class="animate-spin inline w-4 h-4" /> Đang tải...</td></tr>
            <tr v-else-if="records.length === 0"><td colspan="6" class="px-2 py-6 text-center text-gray-400">Chưa có lượt mượn nào</td></tr>
            <tr v-else v-for="r in records" :key="r.id">
              <td class="px-2 py-1">{{ r.nguoiMuon }}<span v-if="r.donViMuon" class="text-gray-400"> ({{ r.donViMuon }})</span></td>
              <td class="px-2 py-1">{{ r.ngayMuon?.slice(0, 10) }}</td>
              <td class="px-2 py-1">{{ r.hanTra?.slice(0, 10) }}</td>
              <td class="px-2 py-1">{{ r.ngayTraThucTe?.slice(0, 10) || '---' }}</td>
              <td class="px-2 py-1">
                <span :class="r.trangThai === 'da_tra' ? 'text-green-600' : (statusLabel(r) === 'Quá hạn' ? 'text-red-600 font-semibold' : 'text-amber-600')">
                  {{ statusLabel(r) }}
                </span>
              </td>
              <td class="px-2 py-1">
                <Button v-if="r.trangThai !== 'da_tra'" variant="outline" size="sm" class="h-7" :disabled="returningId === r.id" @click="handleReturn(r.id)">
                  <Undo2 class="w-3 h-3 mr-1" /> Trả
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </DialogContent>
  </Dialog>
</template>
