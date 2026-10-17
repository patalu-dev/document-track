<script setup lang="ts">
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileUp, Download, Loader2, XCircle, CheckCircle, AlertTriangle } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { h, ref } from 'vue'
import { toast } from 'vue-sonner';
import { request } from '@/lib/api'
import { downloadDocumentTemplate, parseDocumentExcel } from '../lib/excel'

const emit = defineEmits(['success'])
const isOpen = ref(false)
const loading = ref(false)
const preview = ref<any[]>([])
const fileName = ref('')
const result = ref<any>(null)

const handleFile = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  fileName.value = file.name
  result.value = null
  try {
    preview.value = await parseDocumentExcel(file)
    if (preview.value.length === 0) toast('Thông báo', { description: 'File không có dữ liệu hợp lệ', icon: h(XCircle, { class: 'text-red-500 w-5 h-5' }), position: 'top-center' })
    if (preview.value.length > 500) {
      toast('Thông báo', { description: 'File vượt quá 500 dòng, chỉ lấy 500 dòng đầu', icon: h(AlertTriangle, { class: 'text-amber-500 w-5 h-5' }), position: 'top-center' })
      preview.value = preview.value.slice(0, 500)
    }
  } catch (err: any) {
    toast('Lỗi', { description: 'Không đọc được file Excel', icon: h(XCircle, { class: 'text-red-500 w-5 h-5' }), position: 'top-center' })
  }
  input.value = ''
}

const handleImport = async () => {
  if (preview.value.length === 0) return
  loading.value = true
  try {
    const response = await request('/documents/bulk', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: preview.value }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join('; ') : (data.message || 'Import thất bại'))
    result.value = data
    if (data.failed === 0) {
      toast('Thông báo', { description: `Import thành công ${data.saved} chứng từ`, icon: h(CheckCircle, { class: 'text-green-500 w-5 h-5' }), position: 'top-center' })
      preview.value = []
      isOpen.value = false
      emit('success')
    } else {
      toast('Thông báo', { description: `Thành công ${data.saved}, lỗi ${data.failed} dòng`, icon: h(AlertTriangle, { class: 'text-amber-500 w-5 h-5' }), position: 'top-center' })
      emit('success')
    }
  } catch (err: any) {
    toast('Lỗi', { description: err.message, icon: h(XCircle, { class: 'text-red-500 w-5 h-5' }), position: 'top-center' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogTrigger as-child>
      <Button variant="outline" class="w-full md:w-auto" @click="isOpen = true">
        <FileUp class="text-green-600" /> Import Excel
      </Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Thêm nhiều chứng từ (Excel/CSV)</DialogTitle>
        <DialogDescription>Tải file mẫu, điền dữ liệu rồi chọn file để xem trước và import.</DialogDescription>
      </DialogHeader>
      <div class="mt-3 grid gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" @click="downloadDocumentTemplate">
            <Download class="h-4 w-4 mr-1" /> Tải file mẫu
          </Button>
          <span v-if="fileName" class="text-xs text-slate-500">{{ fileName }} — {{ preview.length }} dòng</span>
        </div>
        <div class="grid gap-2">
          <Label>Chọn file Excel (.xlsx, .csv)</Label>
          <Input type="file" accept=".xlsx,.xls,.csv" :disabled="loading" @change="handleFile" />
        </div>
        <div v-if="preview.length > 0" class="border rounded-lg overflow-x-auto max-h-[280px] overflow-y-auto">
          <table class="min-w-full text-xs text-left divide-y divide-gray-200">
            <thead class="bg-gray-50 sticky top-0">
              <tr>
                <th class="px-2 py-1">STT</th>
                <th class="px-2 py-1">Số file</th>
                <th class="px-2 py-1">Tên file</th>
                <th class="px-2 py-1">Ngày lưu</th>
                <th class="px-2 py-1">Vị trí</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="(r, i) in preview.slice(0, 50)" :key="i">
                <td class="px-2 py-1">{{ i + 1 }}</td>
                <td class="px-2 py-1">{{ r.soFile }}</td>
                <td class="px-2 py-1 max-w-[220px] truncate">{{ r.tenFile }}</td>
                <td class="px-2 py-1">{{ r.ngayLuu }}</td>
                <td class="px-2 py-1">{{ r.viTri }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="preview.length > 50" class="text-[11px] text-slate-500 p-2">... và {{ preview.length - 50 }} dòng nữa</p>
        </div>
        <div v-if="result?.errors?.length" class="border border-amber-200 bg-amber-50 rounded-lg p-3 max-h-[180px] overflow-y-auto">
          <p class="text-sm font-semibold text-amber-800 mb-1">Các dòng lỗi ({{ result.failed }}):</p>
          <ul class="text-xs text-amber-700 list-disc pl-4">
            <li v-for="(e, i) in result.errors.slice(0, 30)" :key="i">Dòng {{ e.index }} ({{ e.soFile }}): {{ e.message }}</li>
          </ul>
        </div>
      </div>
      <DialogFooter>
        <Button class="mt-3" @click="handleImport" :disabled="loading || preview.length === 0">
          <template v-if="loading"><Loader2 class="animate-spin" /> Đang import...</template>
          <template v-else><FileUp /> Import {{ preview.length }} dòng</template>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
