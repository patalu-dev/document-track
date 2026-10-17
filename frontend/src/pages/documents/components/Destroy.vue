<script setup lang="ts">
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Flame, Loader2, CheckCircle, XCircle } from 'lucide-vue-next';
import { ref, h, computed } from 'vue'
import { request } from '@/lib/api'
import { toast } from 'vue-sonner'

const props = defineProps({ document: { type: Object, required: true } })
const emit = defineEmits(['success'])
const loading = ref(false)
const showLoading = ref(false)
let loadingTimeout: any = null
const isOpen = ref(false)

const today = new Date().toISOString().split('T')[0]

// Chỉ mở nút khi đã đến hạn hủy (có hạn hủy và hạn hủy <= hôm nay) và không đang cho mượn
const hetHan = computed(() => {
    const h = props.document.thoiGianHuy?.slice(0, 10)
    return !!h && h <= today
})
const dangMuon = computed(() => props.document.trangThai === 'dang_muon')
const enabled = computed(() => hetHan.value && !dangMuon.value)
const disabledReason = computed(() => {
    if (dangMuon.value) return 'Chứng từ đang cho mượn, phải thu hồi trước khi hủy'
    if (!props.document.thoiGianHuy) return 'Chứng từ vô thời hạn, không có hạn hủy'
    return `Chưa đến hạn hủy (hạn hủy ${props.document.thoiGianHuy?.slice(0, 10)})`
})

const handleDestroy = async () => {
    loading.value = true
    loadingTimeout = setTimeout(() => { showLoading.value = true }, 1000)
    try {
        const response = await request(`/documents/${props.document.id}/destroy`, { method: 'POST' })
        if (!response.ok) {
            const e = await response.json()
            throw new Error(Array.isArray(e.message) ? e.message.join('; ') : (e.message || 'Lỗi khi hủy chứng từ'))
        }
        toast('Thông báo', { description: 'Hủy chứng từ thành công', icon: h(CheckCircle, { class: 'text-green-500 w-5 h-5' }), position: 'top-center' });
        isOpen.value = false
        emit('success')
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
    <AlertDialog v-model:open="isOpen">
        <AlertDialogTrigger as-child>
            <span :title="enabled ? 'Hủy chứng từ hết hạn' : disabledReason" class="inline-block">
                <Button variant="outline" size="icon-sm" class="hover:bg-gray-100" :disabled="!enabled">
                    <Flame class="w-4 h-4" :class="enabled ? 'text-orange-600' : 'text-gray-300'" />
                </Button>
            </span>
        </AlertDialogTrigger>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Hủy chứng từ hết hạn</AlertDialogTitle>
                <AlertDialogDescription>
                    Chứng từ <span class="font-semibold text-gray-900">{{ document.soFile }} - {{ document.tenFile }}</span>
                    đã đến hạn hủy ({{ document.thoiGianHuy?.slice(0, 10) }}).
                    Thủ kho xác nhận hủy để xóa khỏi kho (thao tác được lưu nhật ký).
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel :disabled="loading">Hủy bỏ</AlertDialogCancel>
                <AlertDialogAction @click.prevent="handleDestroy" :disabled="loading" class="bg-orange-600 hover:bg-orange-700">
                    <Loader2 v-if="showLoading" class="mr-2 h-4 w-4 animate-spin" />
                    {{ showLoading ? 'Đang hủy...' : 'Xác nhận hủy' }}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
</template>
