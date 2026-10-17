<script setup lang="ts">
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Save, Loader2, XCircle, CheckCircle, Edit } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { h, ref, watch } from 'vue'
import { toast } from 'vue-sonner';
import { request } from '@/lib/api'

const props = defineProps({ department: { type: Object, required: true } })
const emit = defineEmits(['success'])
const name = ref('')
const loading = ref(false)
const showLoading = ref(false)
let loadingTimeout: any = null
const isOpen = ref(false)
const error = ref('')

watch(() => isOpen.value, (val) => {
    if (val) { name.value = props.department.name; error.value = '' }
})

const handleSubmit = async () => {
    error.value = ''
    if (!name.value.trim()) { error.value = 'Tên bộ phận không được để trống'; return }
    loading.value = true
    loadingTimeout = setTimeout(() => { showLoading.value = true }, 1000)
    try {
        const response = await request(`/departments/${props.department.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.value.trim() }),
        })
        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || 'Có lỗi xảy ra khi cập nhật')
        }
        isOpen.value = false
        emit('success')
        toast('Thông báo', {
            description: 'Cập nhật bộ phận thành công',
            icon: h(CheckCircle, { class: 'text-green-500 w-5 h-5' }),
            position: 'top-center',
        });
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
            <Button variant="outline" size="icon-sm" class="hover:bg-gray-100" title="Cập nhật">
                <Edit class="w-4 h-4" />
            </Button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Cập nhật bộ phận</DialogTitle>
                <DialogDescription>Điều chỉnh tên bộ phận và nhấn lưu.</DialogDescription>
            </DialogHeader>
            <div class="grid gap-4 py-4">
                <div class="grid gap-2">
                    <Label>Tên bộ phận <span class="text-red-500">*</span></Label>
                    <Input v-model="name" :disabled="loading" :class="{ 'border-red-500': error }" @update:model-value="error = ''" />
                    <p v-if="error" class="text-[13px] text-red-500">{{ error }}</p>
                </div>
            </div>
            <DialogFooter>
                <Button :disabled="loading" @click="handleSubmit">
                    <template v-if="showLoading"><Loader2 class="animate-spin mr-2 h-4 w-4" /> Đang lưu...</template>
                    <template v-else><Save class="mr-2 h-4 w-4" /> Lưu thay đổi</template>
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
