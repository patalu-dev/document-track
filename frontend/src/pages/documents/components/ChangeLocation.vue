<script setup lang="ts">
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Save, Loader2, XCircle, CheckCircle, ArrowLeftRight } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { h, ref, watch } from 'vue'
import { toast } from 'vue-sonner';
import { request } from '@/lib/api'

const props = defineProps({ document: { type: Object, required: true } })
const emit = defineEmits(['success'])
const isOpen = ref(false)
const loading = ref(false)
const viTri = ref('')
const ghiChu = ref('')
const error = ref('')

watch(() => isOpen.value, (v) => {
  if (v) { viTri.value = props.document.viTri; ghiChu.value = ''; error.value = '' }
})

const handleSubmit = async () => {
  error.value = ''
  if (!viTri.value.trim()) { error.value = 'Vị trí mới không được để trống'; return }
  loading.value = true
  try {
    const response = await request(`/documents/${props.document.id}/location`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viTri: viTri.value.trim(), ghiChu: ghiChu.value.trim() || undefined }),
    })
    if (!response.ok) {
      const e = await response.json()
      throw new Error(e.message || 'Lỗi khi đổi vị trí')
    }
    isOpen.value = false
    emit('success')
    toast('Thông báo', { description: 'Đổi vị trí thành công', icon: h(CheckCircle, { class: 'text-green-500 w-5 h-5' }), position: 'top-center' });
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
      <Button variant="outline" size="icon-sm" class="hover:bg-gray-100" title="Đổi vị trí"><ArrowLeftRight class="w-4 h-4" /></Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Đổi vị trí lưu kho</DialogTitle>
        <DialogDescription>Chứng từ {{ document.soFile }} — vị trí hiện tại: <span class="font-semibold">{{ document.viTri }}</span></DialogDescription>
      </DialogHeader>
      <div class="grid gap-4 py-4">
        <div class="grid gap-2">
          <Label>Vị trí mới <span class="text-red-500">*</span></Label>
          <Input v-model="viTri" placeholder="Kệ B2 - Ngăn 1" :disabled="loading" :class="{ 'border-red-500': error }" />
          <p v-if="error" class="text-[13px] text-red-500">{{ error }}</p>
        </div>
        <div class="grid gap-2">
          <Label>Ghi chú đổi vị trí</Label>
          <Textarea v-model="ghiChu" placeholder="Lý do đổi vị trí..." :disabled="loading" />
        </div>
      </div>
      <DialogFooter>
        <Button @click="handleSubmit" :disabled="loading">
          <template v-if="loading"><Loader2 class="animate-spin mr-2 h-4 w-4" /> Đang lưu...</template>
          <template v-else><Save class="mr-2 h-4 w-4" /> Lưu vị trí</template>
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
