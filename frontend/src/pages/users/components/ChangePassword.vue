<script setup lang="ts">
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { KeyRound, Loader2, CheckCircle, XCircle } from 'lucide-vue-next'
import { ref, h } from 'vue'
import { request } from '@/lib/api'
import { toast } from 'vue-sonner'

const props = defineProps({
    user: {
        type: Object,
        required: true
    }
})

const emit = defineEmits(['success'])
const loading = ref(false)
const showLoading = ref(false)
let loadingTimeout: any = null
const isOpen = ref(false)

const handleResetPass = async () => {
    loading.value = true
    loadingTimeout = setTimeout(() => {
        showLoading.value = true
    }, 1000)

    try {
        const response = await request(`/users/${props.user.id}/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || 'Có lỗi xảy ra khi đặt lại mật khẩu')
        }

        toast('Thông báo', {
            description: `Đã đặt lại mật khẩu cho tài khoản ${props.user.username} về mặc định (123456)`,
            icon: h(CheckCircle, { class: 'text-green-500 w-5 h-5' }),
            position: 'top-center',
        });

        isOpen.value = false
        emit('success')
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
    <AlertDialog v-model:open="isOpen">
        <AlertDialogTrigger as-child>
            <Button variant="outline" size="icon-sm" class="hover:bg-gray-100" title="Đặt lại mật khẩu">
                <KeyRound class="w-4 h-4" />
            </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Đặt lại mật khẩu</AlertDialogTitle>
                <AlertDialogDescription>
                    Bạn có chắc chắn muốn đặt lại mật khẩu của tài khoản <span class="font-semibold text-gray-900">{{
                        user.username }}</span> về mặc định <span class="font-bold text-primary">(123456)</span>?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel :disabled="loading">Hủy</AlertDialogCancel>
                <AlertDialogAction @click.prevent="handleResetPass" :disabled="loading">
                    <Loader2 v-if="showLoading" class="mr-2 h-4 w-4 animate-spin" />
                    {{ showLoading ? 'Đang xử lý...' : 'Xác nhận' }}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
</template>
