<script setup lang="ts">
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Plus, Save, Loader2, XCircle, CheckCircle } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { h, ref } from 'vue'
import { toast } from 'vue-sonner';
import { request } from '@/lib/api'

const emit = defineEmits(['success'])
const name = ref('')
const loading = ref(false)
const showLoading = ref(false)
let loadingTimeout: any = null
const isOpen = ref(false)
const error = ref('')

const handleSubmit = async () => {
    error.value = ''
    if (!name.value.trim()) {
        error.value = 'Tên bộ phận không được để trống'
        return
    }
    loading.value = true
    loadingTimeout = setTimeout(() => { showLoading.value = true }, 1000)
    try {
        const response = await request(`/departments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.value.trim() }),
        })
        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || 'Có lỗi xảy ra khi lưu bộ phận')
        }
        name.value = ''
        isOpen.value = false
        emit('success')
        toast('Thông báo', {
            description: 'Thêm bộ phận thành công',
            icon: h(CheckCircle, { class: 'text-green-500 w-5 h-5' }),
            position: 'top-center',
        });
    } catch (err: any) {
        toast('Thông báo', {
            description: err.message,
            icon: h(XCircle, { class: 'text-red-500 w-5 h-5' }),
            position: 'top-center',
        });
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
            <Button class="w-full md:w-auto" @click="isOpen = true">
                <Plus /> Thêm mới
            </Button>
        </DialogTrigger>
        <DialogContent class="sm:max-w-[425px]">
            <DialogHeader>
                <DialogTitle>Thêm bộ phận</DialogTitle>
                <DialogDescription>Nhập tên bộ phận lưu trữ chứng từ.</DialogDescription>
            </DialogHeader>
            <div class="mt-3 grid gap-4">
                <div class="grid gap-2">
                    <Label class="text-gray-800">Tên bộ phận <span class="text-red-500">*</span></Label>
                    <Input v-model="name" placeholder="VD: Kế toán, Nhân sự..." :disabled="loading"
                        :class="{ 'border-red-500': error }" @update:model-value="error = ''" />
                    <p v-if="error" class="text-[13px] text-red-500">{{ error }}</p>
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
