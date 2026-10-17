<script setup lang="ts">
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2, CheckCircle, XCircle } from 'lucide-vue-next';
import { ref, h } from 'vue'
import { request } from '@/lib/api'
import { toast } from 'vue-sonner'

const props = defineProps({ document: { type: Object, required: true } })
const emit = defineEmits(['success'])
const loading = ref(false)
const showLoading = ref(false)
let loadingTimeout: any = null
const isOpen = ref(false)

const handleDelete = async () => {
    loading.value = true
    loadingTimeout = setTimeout(() => { showLoading.value = true }, 1000)
    try {
        const response = await request(`/documents/${props.document.id}`, { method: 'DELETE' })
        if (!response.ok) {
            const e = await response.json()
            throw new Error(e.message || 'Lỗi khi xóa chứng từ')
        }
        toast('Thông báo', { description: 'Xóa thành công', icon: h(CheckCircle, { class: 'text-green-500 w-5 h-5' }), position: 'top-center' });
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
            <Button variant="outline" size="icon-sm" class="hover:bg-gray-100" title="Xóa">
                <Trash2 class="w-4 h-4" />
            </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Xóa chứng từ</AlertDialogTitle>
                <AlertDialogDescription>
                    Xóa chứng từ <span class="font-semibold text-gray-900">{{ document.soFile }} - {{ document.tenFile }}</span>?
                    Hành động này không thể hoàn tác.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel :disabled="loading">Hủy</AlertDialogCancel>
                <AlertDialogAction @click.prevent="handleDelete" :disabled="loading" class="bg-red-600 hover:bg-red-700">
                    <Loader2 v-if="showLoading" class="mr-2 h-4 w-4 animate-spin" />
                    {{ showLoading ? 'Đang xóa...' : 'Xóa' }}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
</template>
