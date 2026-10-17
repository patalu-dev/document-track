<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useBreadcrumb } from '@/composables/useBreadcrumb'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Inbox, Search, Building2 } from 'lucide-vue-next'
import Create from './components/Create.vue'
import Edit from './components/Edit.vue'
import Delete from './components/Delete.vue'
import { Input } from '@/components/ui/input'
import { request } from '@/lib/api'
import { useRouter, useRoute } from 'vue-router'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/composables/useAuth'

const { user, can } = useAuth()
const { setBreadcrumbs } = useBreadcrumb()
const router = useRouter()
const route = useRoute()

setBreadcrumbs([
    { title: 'Kho lưu trữ', href: '#' },
    { title: 'Bộ phận' },
])

const departments = ref<any[]>([])
const loading = ref(false)
const filters = ref({ name: '' })
const pagination = ref({ page: 1, limit: 10, total: 0, totalPages: 0 })
const error = ref<string | null>(null)
let searchTimeout: any = null

const displayedPages = computed(() => {
    const total = pagination.value.totalPages
    const current = pagination.value.page
    const pages: (number | string)[] = []
    if (total <= 6) { for (let i = 1; i <= total; i++) pages.push(i); return pages }
    if (current <= 3) { pages.push(1, 2, 3, 4, '...', total) }
    else if (current >= total - 2) { pages.push(1, '...', total - 3, total - 2, total - 1, total) }
    else { pages.push(1, '...', current - 1, current, current + 1, '...', total) }
    return pages
})

const fetchDepartments = async () => {
    if (!user.value) return
    loading.value = true
    error.value = null
    try {
        const queryParams = new URLSearchParams()
        if (filters.value.name) queryParams.append('name', filters.value.name)
        queryParams.append('page', pagination.value.page.toString())
        queryParams.append('limit', pagination.value.limit.toString())
        const response = await request(`/departments?${queryParams.toString()}`)
        if (!response.ok) throw new Error('Không tải được danh sách bộ phận')
        const result = await response.json()
        departments.value = result.items || []
        pagination.value.total = result.total || 0
        pagination.value.totalPages = result.totalPages || 0
    } catch (err: any) {
        error.value = err.message
    } finally {
        loading.value = false
    }
}

const handlePageChange = (newPage: number) => {
    router.replace({ query: { ...route.query, page: newPage.toString() } })
}

const syncFiltersFromUrl = () => {
    filters.value.name = (route.query.name as string) || ''
    pagination.value.page = route.query.page ? parseInt(route.query.page as string) : 1
}

watch(() => filters.value.name, (newVal) => {
    if (searchTimeout) clearTimeout(searchTimeout)
    if (newVal === (route.query.name || '')) return
    searchTimeout = setTimeout(() => {
        router.replace({ query: { ...route.query, name: filters.value.name || undefined, page: '1' } })
    }, 500)
})

watch(() => route.query, () => { syncFiltersFromUrl(); fetchDepartments() }, { deep: true })

onMounted(() => { syncFiltersFromUrl(); fetchDepartments() })
</script>

<template>
    <div class="flex flex-1 flex-col gap-4 p-4 pt-3">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white px-4 py-3 rounded-lg border border-slate-200/80 shadow-xs">
            <div>
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-xs">
                        <Building2 class="w-4 h-4" />
                    </div>
                    <h1 class="text-xl font-bold text-slate-900">Quản lý bộ phận</h1>
                </div>
                <p class="text-xs text-slate-500 mt-1">Danh sách bộ phận lưu trữ chứng từ</p>
            </div>
            <div class="flex items-center gap-2">
                <div class="relative w-full md:w-64">
                    <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input v-model="filters.name" placeholder="Tìm kiếm theo tên..." class="pl-8 h-9 shadow-none bg-white" />
                </div>
                <Create v-if="can('create', 'Department')" @success="fetchDepartments" />
            </div>
        </div>
        <div class="overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white">
            <div class="w-full overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 text-sm text-left">
                    <thead class="text-gray-700 font-medium h-8">
                        <tr>
                            <th class="px-4 py-1 border-b whitespace-nowrap w-12 text-center">STT</th>
                            <th class="px-4 py-1 border-b whitespace-nowrap">Tên bộ phận</th>
                            <th class="px-4 py-1 border-b whitespace-nowrap">Ngày tạo</th>
                            <th class="px-4 py-1 border-b whitespace-nowrap">Hành động</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        <tr v-if="loading">
                            <td colspan="4" class="px-4 py-10 text-center">
                                <div class="flex flex-col items-center justify-center gap-3">
                                    <Spinner class="w-6 h-6 text-gray-400" />
                                    <span class="text-sm text-gray-400">Đang tải dữ liệu...</span>
                                </div>
                            </td>
                        </tr>
                        <tr v-else-if="!loading && departments.length === 0">
                            <td colspan="4" class="px-4 py-12 text-center text-gray-500">
                                <div class="flex flex-col items-center justify-center">
                                    <Inbox class="w-12 h-12 text-gray-300 mb-4" />
                                    <p class="text-base text-gray-400">Không có dữ liệu để hiển thị</p>
                                </div>
                            </td>
                        </tr>
                        <tr v-else class="hover:bg-gray-50 transition-colors h-10" v-for="(dept, index) in departments" :key="dept.id">
                            <td class="px-4 py-0.5 whitespace-nowrap text-center">{{ (pagination.page - 1) * pagination.limit + index + 1 }}</td>
                            <td class="px-4 py-0.5 whitespace-nowrap font-medium">{{ dept.name }}</td>
                            <td class="px-4 py-0.5 whitespace-nowrap">{{ dept.createdAt ? new Date(dept.createdAt).toLocaleDateString('vi-VN') : '---' }}</td>
                            <td class="px-4 py-0.5 whitespace-nowrap">
                                <div class="flex gap-1">
                                    <Edit v-if="can('update', 'Department')" :department="dept" @success="fetchDepartments" />
                                    <Delete v-if="can('delete', 'Department')" :department="dept" @success="fetchDepartments" />
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <div class="flex flex-col md:flex-row items-center justify-between px-2">
            <div class="text-sm text-gray-500 md:text-center md:mb-0 mb-4">
                Hiển thị từ {{ (pagination.page - 1) * pagination.limit + 1 }}-{{ Math.min(pagination.page * pagination.limit, pagination.total) }} / {{ pagination.total }} kết quả
            </div>
            <div class="flex items-center gap-2">
                <Button variant="outline" size="sm" :disabled="pagination.page <= 1 || loading" @click="handlePageChange(pagination.page - 1)">
                    <ChevronLeft class="h-4 w-4 mr-1" /> Trước
                </Button>
                <div class="flex items-center gap-1">
                    <template v-for="(p, i) in displayedPages" :key="i">
                        <Button v-if="typeof p === 'number'" size="icon-sm" :variant="p === pagination.page ? 'outline' : 'ghost'" @click="handlePageChange(p)" :disabled="loading">{{ p }}</Button>
                        <span v-else class="px-2 text-gray-400">...</span>
                    </template>
                </div>
                <Button variant="outline" size="sm" :disabled="pagination.page >= pagination.totalPages || loading" @click="handlePageChange(pagination.page + 1)">
                    Sau <ChevronRight class="h-4 w-4 ml-1" />
                </Button>
            </div>
        </div>
    </div>
</template>
