<script setup lang="ts">
import { ref, watch } from 'vue'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { X, Search } from 'lucide-vue-next'
import {
    Card,
    CardContent,
} from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

const props = defineProps({
    initialFilters: {
        type: Object,
        default: () => ({
            name: '',
            username: '',
            email: '',
            role: [],
            status: '',
        })
    },
    loading: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['search'])

// State
const filters = ref({ ...props.initialFilters })

// Watch for prop changes to sync internal state
watch(() => props.initialFilters, (newVal: any) => {
    filters.value = { ...newVal }
}, { deep: true })

const handleSearch = () => {
    emit('search', { ...filters.value })
}

const handleClear = () => {
    filters.value.name = ''
    filters.value.username = ''
    filters.value.email = ''
    filters.value.role = []
    filters.value.status = ''
    handleSearch()
}
</script>

<template>
    <Card class="rounded-lg">
        <CardContent>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div class="flex flex-col gap-2">
                    <Label for="name">Họ tên</Label>
                    <Input id="name" type="text" v-model="filters.name" placeholder="Họ tên" />
                </div>
                <div class="flex flex-col gap-2">
                    <Label for="username">Tài khoản</Label>
                    <Input id="username" type="text" v-model="filters.username" placeholder="Nhập tài khoản" />
                </div>
                <div class="flex flex-col gap-2">
                    <Label for="email">Email</Label>
                    <Input id="email" type="text" v-model="filters.email" placeholder="Nhập email" />
                </div>
                <div class="flex flex-col gap-2">
                    <Label for="role">Vai trò</Label>
                    <Select v-model="filters.role" multiple>
                        <SelectTrigger id="role" class="w-full">
                            <SelectValue placeholder="Chọn vai trò">
                                <template v-if="filters.role && filters.role.length > 0">
                                    <div class="flex flex-wrap gap-1">
                                        <div v-for="role in filters.role" :key="role"
                                            class="bg-gray-200 text-gray-800 px-2 py-0.5 rounded text-xs font-medium capitalize">
                                            {{ role }}
                                        </div>
                                    </div>
                                </template>
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div class="flex flex-col gap-2">
                    <Label for="status">Trạng thái</Label>
                    <Select v-model="filters.status">
                        <SelectTrigger id="status" class="w-full">
                            <SelectValue placeholder="Chọn trạng thái" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">Hoạt động</SelectItem>
                            <SelectItem value="inactive">Không hoạt động</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div class="flex gap-2 justify-end mt-4">
                <Button variant="outline" @click="handleSearch" :disabled="loading">
                    <Search class="h-4 w-4 mr-2" /> Tìm kiếm
                </Button>
                <Button variant="secondary" size="icon" @click="handleClear" :disabled="loading">
                    <X class="h-4 w-4" aria-label="Xóa bộ lọc" />
                </Button>
            </div>
        </CardContent>
    </Card>
</template>

<style scoped>
/* Custom styles if needed */
</style>