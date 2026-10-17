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
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

const props = defineProps({
    initialFilters: {
        type: Object,
        default: () => ({
            keyword: '',
            departmentId: 'all',
            viTri: '',
            ngayLuuTu: '',
            ngayLuuDen: '',
            sapHetHan: false,
            quaHanHuy: false,
        })
    },
    departments: {
        type: Array as () => any[],
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
    }
})

const emit = defineEmits(['search'])

// State
const filters = ref({ ...props.initialFilters })

// Watch for prop changes to sync internal state (back/forward navigation)
watch(() => props.initialFilters, (newVal: any) => {
    filters.value = { ...newVal }
}, { deep: true })

const handleSearch = () => {
    emit('search', { ...filters.value })
}

const handleClear = () => {
    filters.value.keyword = ''
    filters.value.departmentId = 'all'
    filters.value.viTri = ''
    filters.value.ngayLuuTu = ''
    filters.value.ngayLuuDen = ''
    filters.value.sapHetHan = false
    filters.value.quaHanHuy = false
    handleSearch()
}
</script>

<template>
    <Card class="rounded-lg">
        <CardContent>
            <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div class="flex flex-col gap-2">
                    <Label for="keyword">Từ khóa</Label>
                    <Input id="keyword" type="text" v-model="filters.keyword" placeholder="Tìm số file, tên file, tên hồ sơ..." />
                </div>
                <div class="flex flex-col gap-2">
                    <Label for="viTri">Vị trí</Label>
                    <Input id="viTri" type="text" v-model="filters.viTri" placeholder="VD: Kệ A1..." />
                </div>
                <div class="flex flex-col gap-2">
                    <Label for="department">Bộ phận</Label>
                    <Select v-model="filters.departmentId">
                        <SelectTrigger id="department" class="w-full">
                            <SelectValue placeholder="Tất cả bộ phận" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectItem value="all">Tất cả bộ phận</SelectItem>
                                <SelectItem v-for="d in departments" :key="d.id" :value="String(d.id)">
                                    {{ d.name }}
                                </SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>
                <div class="flex flex-col gap-2">
                    <Label for="ngayLuuTu">Ngày lưu từ</Label>
                    <Input id="ngayLuuTu" type="date" v-model="filters.ngayLuuTu" />
                </div>
                <div class="flex flex-col gap-2">
                    <Label for="ngayLuuDen">Ngày lưu đến</Label>
                    <Input id="ngayLuuDen" type="date" v-model="filters.ngayLuuDen" />
                </div>
            </div>
            <div class="flex gap-2 justify-end mt-4">
                <Button variant="outline" @click="handleSearch" :disabled="loading">
                    <Search class="h-4 w-4" /> Tìm kiếm
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
