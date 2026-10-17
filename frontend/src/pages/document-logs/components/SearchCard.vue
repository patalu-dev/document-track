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
import { LOG_ACTION_OPTIONS } from '../lib/logActions'

const props = defineProps({
    initialFilters: {
        type: Object,
        default: () => ({
            keyword: '',
            action: 'all',
            documentId: '',
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

// Watch for prop changes to sync internal state (back/forward navigation)
watch(() => props.initialFilters, (newVal: any) => {
    filters.value = { ...newVal }
}, { deep: true })

const handleSearch = () => {
    emit('search', { ...filters.value })
}

const handleClear = () => {
    filters.value.keyword = ''
    filters.value.action = 'all'
    filters.value.documentId = ''
    handleSearch()
}
</script>

<template>
    <Card class="rounded-lg">
        <CardContent>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div class="flex flex-col gap-2">
                    <Label for="keyword">Từ khóa</Label>
                    <Input id="keyword" type="text" v-model="filters.keyword" placeholder="Tìm số file, người thao tác, nội dung..." />
                </div>
                <div class="flex flex-col gap-2">
                    <Label for="action">Hành động</Label>
                    <Select v-model="filters.action">
                        <SelectTrigger id="action" class="w-full">
                            <SelectValue placeholder="Tất cả hành động" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                <SelectItem value="all">Tất cả hành động</SelectItem>
                                <SelectItem v-for="o in LOG_ACTION_OPTIONS" :key="o.value" :value="o.value">
                                    {{ o.label }}
                                </SelectItem>
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </div>
                <div class="flex gap-2 items-end">
                    <Button variant="outline" @click="handleSearch" :disabled="loading">
                        <Search class="h-4 w-4 mr-2" /> Tìm kiếm
                    </Button>
                    <Button variant="secondary" size="icon" @click="handleClear" :disabled="loading">
                        <X class="h-4 w-4" aria-label="Xóa bộ lọc" />
                    </Button>
                </div>
            </div>
        </CardContent>
    </Card>
</template>

<style scoped>
/* Custom styles if needed */
</style>
