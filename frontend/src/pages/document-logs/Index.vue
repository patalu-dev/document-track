<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useBreadcrumb } from '@/composables/useBreadcrumb'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Inbox, ScrollText, X } from 'lucide-vue-next'
import SearchCard from './components/SearchCard.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import { request } from '@/lib/api'
import { useRouter, useRoute } from 'vue-router'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/composables/useAuth'
import { logActionLabel, logActionVariant } from './lib/logActions'

const { user } = useAuth()
const { setBreadcrumbs } = useBreadcrumb()
const router = useRouter()
const route = useRoute()

setBreadcrumbs([
    { title: 'Kho lưu trữ', href: '#' },
    { title: 'Nhật ký chứng từ' },
])

const logs = ref<any[]>([])
const loading = ref(false)
const filters = ref({
    keyword: '',
    action: 'all',
    documentId: '',
})
const pagination = ref({ page: 1, limit: 10, total: 0, totalPages: 0 })
const error = ref<string | null>(null)

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

const fetchLogs = async () => {
    if (!user.value) return
    loading.value = true
    error.value = null
    try {
        const qp = new URLSearchParams()
        if (filters.value.keyword) qp.append('keyword', filters.value.keyword)
        if (filters.value.action && filters.value.action !== 'all') qp.append('action', filters.value.action)
        if (filters.value.documentId) qp.append('documentId', filters.value.documentId)
        qp.append('order', 'asc')
        qp.append('page', pagination.value.page.toString())
        qp.append('limit', pagination.value.limit.toString())
        const response = await request(`/document-logs?${qp.toString()}`)
        if (!response.ok) throw new Error('Không tải được nhật ký chứng từ')
        const result = await response.json()
        logs.value = result.items || []
        pagination.value.total = result.total || 0
        pagination.value.totalPages = result.totalPages || 0
    } catch (err: any) {
        error.value = err.message
    } finally {
        loading.value = false
    }
}

const syncFromUrl = () => {
    filters.value.keyword = (route.query.keyword as string) || ''
    filters.value.action = (route.query.action as string) || 'all'
    filters.value.documentId = (route.query.documentId as string) || ''
    pagination.value.page = route.query.page ? parseInt(route.query.page as string) : 1
}

const handleSearch = (newFilters: any) => {
    filters.value = { ...newFilters }
    pagination.value.page = 1

    // Update URL
    router.replace({
        query: {
            ...route.query,
            keyword: filters.value.keyword || undefined,
            action: (filters.value.action && filters.value.action !== 'all') ? filters.value.action : undefined,
            documentId: filters.value.documentId || undefined,
            page: pagination.value.page.toString(),
        }
    })
}

const clearDocumentFilter = () => {
    handleSearch({ ...filters.value, documentId: '' })
}

const handlePageChange = (p: number) => {
    pagination.value.page = p

    // Update URL
    router.replace({
        query: {
            ...route.query,
            page: p.toString(),
        }
    })
}

// Watch for URL changes (back/forward navigation)
watch(() => route.query, () => {
    syncFromUrl()
    fetchLogs()
})

onMounted(() => { syncFromUrl(); fetchLogs() })

const formatTime = (v: string) => {
    if (!v) return '---'
    return new Date(v).toLocaleString('vi-VN')
}
</script>

<template>
    <div class="flex flex-1 flex-col gap-4 p-4 pt-3">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white px-4 py-3 rounded-lg border border-slate-200/80 shadow-xs">
            <div>
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-xs">
                        <ScrollText class="w-4 h-4" />
                    </div>
                    <h1 class="text-xl font-bold text-slate-900">Lịch sử chứng từ</h1>
                </div>
                <p class="text-xs text-slate-500 mt-1">Lịch sử mọi thao tác thêm, sửa, xóa, đổi vị trí, mượn, trả chứng từ</p>
            </div>
        </div>
        <SearchCard :initial-filters="filters" :loading="loading" @search="handleSearch" />
        <div v-if="filters.documentId" class="flex items-center gap-2 text-xs bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <span class="text-slate-600">Đang lọc theo chứng từ #{{ filters.documentId }}</span>
            <Button variant="ghost" size="sm" class="h-6 px-2 text-blue-600" @click="clearDocumentFilter">
                <X class="h-3 w-3 mr-1" /> Bỏ lọc
            </Button>
        </div>

        <div class="overflow-x-auto border border-gray-200 rounded-lg mt-2 shadow-sm bg-white">
            <div class="w-full overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 text-sm text-left">
                    <thead class="text-gray-700 font-medium h-8">
                        <tr>
                            <th class="px-3 py-1 border-b whitespace-nowrap w-12 text-center">STT</th>
                            <th class="px-3 py-1 border-b whitespace-nowrap">Thời gian</th>
                            <th class="px-3 py-1 border-b whitespace-nowrap">Số file</th>
                            <th class="px-3 py-1 border-b whitespace-nowrap">Hành động</th>
                            <th class="px-3 py-1 border-b whitespace-nowrap">Người thao tác</th>
                            <th class="px-3 py-1 border-b whitespace-nowrap">Chi tiết</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        <tr v-if="loading">
                            <td colspan="6" class="px-4 py-10 text-center">
                                <div class="flex flex-col items-center justify-center gap-3">
                                    <Spinner class="w-6 h-6 text-gray-400" />
                                    <span class="text-sm text-gray-400">Đang tải dữ liệu...</span>
                                </div>
                            </td>
                        </tr>
                        <tr v-else-if="!loading && logs.length === 0">
                            <td colspan="6" class="px-4 py-12 text-center text-gray-500">
                                <div class="flex flex-col items-center justify-center">
                                    <Inbox class="w-12 h-12 text-gray-300 mb-4" />
                                    <p class="text-base text-gray-400">Không có dữ liệu để hiển thị</p>
                                </div>
                            </td>
                        </tr>
                        <tr v-else class="hover:bg-gray-50 transition-colors" v-for="(l, index) in logs" :key="l.id">
                            <td class="px-3 py-1.5 whitespace-nowrap text-center">{{ (pagination.page - 1) * pagination.limit + index + 1 }}</td>
                            <td class="px-3 py-1.5 whitespace-nowrap text-xs">{{ formatTime(l.createdAt) }}</td>
                            <td class="px-3 py-1.5 whitespace-nowrap font-medium">{{ l.soFile || '---' }}</td>
                            <td class="px-3 py-1.5 whitespace-nowrap"><Badge :variant="logActionVariant(l.action)">{{ logActionLabel(l.action) }}</Badge></td>
                            <td class="px-3 py-1.5 whitespace-nowrap">{{ l.actor || '---' }}</td>
                            <td class="px-3 py-1.5 max-w-[420px]"><p class="truncate text-xs text-slate-600" :title="l.details">{{ l.details || '---' }}</p></td>
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
