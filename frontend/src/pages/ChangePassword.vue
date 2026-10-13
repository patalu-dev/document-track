<script setup lang="ts">
import { ref, h } from 'vue'
import { useBreadcrumb } from '@/composables/useBreadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, Save, Loader2, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-vue-next'
import { request } from '@/lib/api'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { toast } from 'vue-sonner'

const { setBreadcrumbs } = useBreadcrumb()
const router = useRouter()
const { logout } = useAuth()

setBreadcrumbs([
    { title: 'Thay đổi mật khẩu' },
])

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const showLoading = ref(false)
const showCurrentPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
let loadingTimeout: any = null

const submit = async () => {
    if (!currentPassword.value) {
        toast('Lỗi', {
            description: 'Vui lòng nhập mật khẩu hiện tại',
            icon: h(XCircle, { class: 'text-red-500 w-5 h-5' }),
            position: 'top-center',
        })
        return
    }

    if (!newPassword.value) {
        toast('Lỗi', {
            description: 'Vui lòng nhập mật khẩu mới',
            icon: h(XCircle, { class: 'text-red-500 w-5 h-5' }),
            position: 'top-center',
        })
        return
    }

    if (newPassword.value.length < 8 || !/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9])/.test(newPassword.value)) {
        toast('Lỗi', {
            description: 'Mật khẩu mới phải có ít nhất 8 ký tự gồm cả chữ, số và ký tự đặc biệt',
            icon: h(XCircle, { class: 'text-red-500 w-5 h-5' }),
            position: 'top-center',
        })
        return
    }

    if (newPassword.value !== confirmPassword.value) {
        toast('Lỗi', {
            description: 'Mật khẩu nhập lại không khớp',
            icon: h(XCircle, { class: 'text-red-500 w-5 h-5' }),
            position: 'top-center',
        })
        return
    }

    loading.value = true
    loadingTimeout = setTimeout(() => {
        showLoading.value = true
    }, 1000)

    try {
        const response = await request('/auth/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                currentPassword: currentPassword.value,
                newPassword: newPassword.value,
            }),
        })

        if (!response.ok) {
            const data = await response.json().catch(() => null)
            const msg = Array.isArray((data as any)?.message)
                ? (data as any).message.join(', ')
                : (data as any)?.message || 'Có lỗi xảy ra khi đổi mật khẩu'
            throw new Error(msg)
        }

        const result = await response.json().catch(() => null)

        toast('Thành công', {
            description: result?.message || 'Mật khẩu đã được thay đổi thành công, vui lòng đăng nhập lại',
            icon: h(CheckCircle, { class: 'text-green-500 w-5 h-5' }),
            position: 'top-center',
        })

        currentPassword.value = ''
        newPassword.value = ''
        confirmPassword.value = ''
        // Backend đã đá hết session (tăng tokenVersion, xóa refreshToken)
        // nên bắt buộc đăng nhập lại bằng mật khẩu mới.
        // Token hiện tại đã chết -> logout local, không gọi /auth/logout nữa.
        await logout(false)
    } catch (err: any) {
        toast('Lỗi', {
            description: err.message,
            icon: h(XCircle, { class: 'text-red-500 w-5 h-5' }),
            position: 'top-center',
        })
    } finally {
        if (loadingTimeout) clearTimeout(loadingTimeout)
        loading.value = false
        showLoading.value = false
    }
}
</script>

<template>
    <div class="flex flex-1 flex-col gap-4 p-4 pt-3">
        <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div class="flex items-center gap-4">
                <h1 class="text-xl font-semibold">Thay đổi mật khẩu</h1>
            </div>
        </div>

        <div class="flex items-start justify-center mt-6">
            <Card class="w-full max-w-lg">
                <form @submit.prevent="submit">
                    <CardHeader>
                        <CardTitle class="flex items-center gap-2">
                            <Lock class="h-5 w-5" />
                            Đổi mật khẩu
                        </CardTitle>
                        <CardDescription>
                            Nhập mật khẩu hiện tại và mật khẩu mới của bạn
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div class="grid gap-4 mt-6">
                            <div class="grid gap-2">
                                <label for="currentPassword" class="text-sm font-medium">Mật khẩu hiện tại</label>
                                <div class="relative">
                                    <Input id="currentPassword" v-model="currentPassword"
                                        :type="showCurrentPassword ? 'text' : 'password'"
                                        placeholder="Nhập mật khẩu hiện tại" />
                                    <button type="button" @click="showCurrentPassword = !showCurrentPassword"
                                        class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                        <Eye v-if="!showCurrentPassword" class="h-4 w-4" />
                                        <EyeOff v-else class="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <div class="grid gap-2">
                                <label for="newPassword" class="text-sm font-medium">Mật khẩu mới</label>
                                <div class="relative">
                                    <Input id="newPassword" v-model="newPassword"
                                        :type="showNewPassword ? 'text' : 'password'"
                                        placeholder="Nhập mật khẩu mới" />
                                    <button type="button" @click="showNewPassword = !showNewPassword"
                                        class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                        <Eye v-if="!showNewPassword" class="h-4 w-4" />
                                        <EyeOff v-else class="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                            <div class="grid gap-2">
                                <label for="confirmPassword" class="text-sm font-medium">Xác nhận mật khẩu mới</label>
                                <div class="relative">
                                    <Input id="confirmPassword" v-model="confirmPassword"
                                        :type="showConfirmPassword ? 'text' : 'password'"
                                        placeholder="Nhập lại mật khẩu mới" />
                                    <button type="button" @click="showConfirmPassword = !showConfirmPassword"
                                        class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                        <Eye v-if="!showConfirmPassword" class="h-4 w-4" />
                                        <EyeOff v-else class="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <div class="flex items-center justify-end gap-3 px-6 mt-6">
                        <Button type="button" variant="outline" @click="router.push('/dashboard')">
                            Hủy
                        </Button>
                        <Button type="submit" :disabled="loading">
                            <Loader2 v-if="showLoading" class="h-4 w-4 animate-spin" />
                            <Save v-else class="h-4 w-4" />
                            {{ showLoading ? 'Đang xử lý...' : 'Lưu mật khẩu' }}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    </div>
</template>
