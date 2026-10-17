<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useBreadcrumb } from '@/composables/useBreadcrumb'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Inbox, Archive, FileSpreadsheet } from 'lucide-vue-next'
import Create from './components/Create.vue'
import ImportExcel from './components/ImportExcel.vue'
import Edit from './components/Edit.vue'
import Delete from './components/Delete.vue'
import Destroy from './components/Destroy.vue'
import ChangeLocation from './components/ChangeLocation.vue'
import Borrow from './components/Borrow.vue'
import History from './components/History.vue'
import SearchCard from './components/SearchCard.vue'
import { Badge } from '@/components/ui/badge'
import { request } from '@/lib/api'
import { useRouter, useRoute } from 'vue-router'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/composables/useAuth'
import { exportDocuments, trangThaiLabel, loaiThoiGianLabel } from './lib/excel'

const { user, can } = useAuth()
const { setBreadcrumbs } = useBreadcrumb()
const router = useRouter()
const route = useRoute()

setBreadcrumbs([
    { title: 'Kho lưu trữ', href: '#' },
    { title: 'Chứng từ' },
])

const docs = ref<any[]>([])
const departments = ref<any[]>([])
const stats = ref<any>({ total: 0, luuKho: 0, dangMuon: 0, sapHetHan: 0, quaHanHuy: 0 })
const loading = ref(false)
const filters = ref({
    keyword: '', departmentId: 'all', viTri: '', ngayLuuTu: '', ngayLuuDen: '',
    sapHetHan: false, quaHanHuy: false,
})
const pagination = ref({ page: 1, limit: 10, total: 0, totalPages: 0 })
const error = ref<string | null>(null)

const isQuaHanHuy = (d: any) => {
    const ngay = d.thoiGianHuy?.slice(0, 10)
    if (!ngay) return false
    return ngay < new Date().toISOString().split('T')[0]
}

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
    try {
        const res = await request('/departments/select/all')
        if (res.ok) departments.value = await res.json()
    } catch { /* ignore */ }
}

const fetchStats = async () => {
    try {
        const res = await request('/documents/stats/overview')
        if (res.ok) stats.value = await res.json()
    } catch { /* ignore */ }
}

const fetchDocs = async () => {
    if (!user.value) return
    loading.value = true
    error.value = null
    try {
        const qp = new URLSearchParams()
        if (filters.value.keyword) qp.append('keyword', filters.value.keyword)
        if (filters.value.departmentId && filters.value.departmentId !== 'all') qp.append('departmentId', filters.value.departmentId)
        if (filters.value.viTri) qp.append('viTri', filters.value.viTri)
        if (filters.value.ngayLuuTu) qp.append('ngayLuuTu', filters.value.ngayLuuTu)
        if (filters.value.ngayLuuDen) qp.append('ngayLuuDen', filters.value.ngayLuuDen)
        if (filters.value.sapHetHan) qp.append('sapHetHan', 'true')
        if (filters.value.quaHanHuy) qp.append('quaHanHuy', 'true')
        qp.append('page', pagination.value.page.toString())
        qp.append('limit', pagination.value.limit.toString())
        const response = await request(`/documents?${qp.toString()}`)
        if (!response.ok) throw new Error('Không tải được danh sách chứng từ')
        const result = await response.json()
        docs.value = result.items || []
        pagination.value.total = result.total || 0
        pagination.value.totalPages = result.totalPages || 0
    } catch (err: any) {
        error.value = err.message
    } finally {
        loading.value = false
    }
}

const refreshAll = () => { fetchDocs(); fetchStats() }

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
    fetchDocs()
})

onMounted(() => { syncFromUrl(); fetchDocs(); fetchDepartments(); fetchStats() })

const syncFromUrl = () => {
    filters.value.keyword = (route.query.keyword as string) || ''
    filters.value.departmentId = (route.query.departmentId as string) || 'all'
    filters.value.viTri = (route.query.viTri as string) || ''
    filters.value.ngayLuuTu = (route.query.ngayLuuTu as string) || ''
    filters.value.ngayLuuDen = (route.query.ngayLuuDen as string) || ''
    filters.value.sapHetHan = route.query.sapHetHan === 'true'
    filters.value.quaHanHuy = route.query.quaHanHuy === 'true'
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
            departmentId: (filters.value.departmentId && filters.value.departmentId !== 'all') ? filters.value.departmentId : undefined,
            viTri: filters.value.viTri || undefined,
            ngayLuuTu: filters.value.ngayLuuTu || undefined,
            ngayLuuDen: filters.value.ngayLuuDen || undefined,
            sapHetHan: filters.value.sapHetHan ? 'true' : undefined,
            quaHanHuy: filters.value.quaHanHuy ? 'true' : undefined,
            page: pagination.value.page.toString(),
        }
    })
}

const handleExport = async () => {
    await exportDocuments({
        keyword: filters.value.keyword,
        departmentId: filters.value.departmentId !== 'all' ? filters.value.departmentId : undefined,
        viTri: filters.value.viTri || undefined,
        ngayLuuTu: filters.value.ngayLuuTu || undefined,
        ngayLuuDen: filters.value.ngayLuuDen || undefined,
    })
}

const badgeVariant = (tt: string) => tt === 'dang_muon' ? 'default' : 'secondary'
</script>

<template>
    <div class="flex flex-1 flex-col gap-4 p-4 pt-3">
        <!-- Thống kê -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div class="bg-white rounded-lg border px-3 py-2"><p class="text-[12px] text-slate-600">Tổng chứng từ</p><p class="text-[22px] font-bold">{{ stats.total }}</p></div>
            <div class="bg-white rounded-lg border px-3 py-2"><p class="text-[12px] text-slate-600">Đang lưu kho</p><p class="text-[22px] font-bold text-green-600">{{ stats.luuKho }}</p></div>
            <div class="bg-white rounded-lg border px-3 py-2"><p class="text-[12px] text-slate-600">Đang cho mượn</p><p class="text-[22px] font-bold text-amber-600">{{ stats.dangMuon }}</p></div>
            <div class="bg-white rounded-lg border px-3 py-2"><p class="text-[12px] text-slate-600">Sắp hết hạn (30 ngày)</p><p class="text-[22px] font-bold text-orange-600">{{ stats.sapHetHan }}</p></div>
            <div class="bg-white rounded-lg border px-3 py-2"><p class="text-[12px] text-slate-600">Quá hạn hủy</p><p class="text-[22px] font-bold text-red-600">{{ stats.quaHanHuy }}</p></div>
        </div>

        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white px-4 py-3 rounded-lg border border-slate-200/80 shadow-xs">
            <div>
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-xs">
                        <Archive class="w-4 h-4" />
                    </div>
                    <h1 class="text-xl font-bold text-slate-900">Quản lý chứng từ</h1>
                </div>
                <p class="text-xs text-slate-500 mt-1">Danh sách chứng từ lưu kho hiện tại</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
                <ImportExcel v-if="can('import', 'Document')" @success="refreshAll" />
                <Create v-if="can('create', 'Document')" @success="refreshAll" />
            </div>
        </div>
        <SearchCard :initial-filters="filters" :departments="departments" :loading="loading" @search="handleSearch" />

        <div class="overflow-x-auto border border-gray-200 rounded-lg mt-2 shadow-sm bg-white">
            <div class="w-full overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 text-sm text-left">
                    <thead class="text-gray-700 font-medium h-8">
                        <tr>
                            <th class="px-3 py-1 border-b whitespace-nowrap w-12 text-center">STT</th>
                            <th class="px-3 py-1 border-b whitespace-nowrap">Số file</th>
                            <th class="px-3 py-1 border-b whitespace-nowrap">Tên file / Hồ sơ</th>
                            <th class="px-3 py-1 border-b whitespace-nowrap">Ngày lưu</th>
                            <th class="px-3 py-1 border-b whitespace-nowrap">Bộ phận</th>
                            <th class="px-3 py-1 border-b whitespace-nowrap">Vị trí</th>
                            <th class="px-3 py-1 border-b whitespace-nowrap">Thời hạn</th>
                            <th class="px-3 py-1 border-b whitespace-nowrap">Trạng thái</th>
                            <th class="px-3 py-1 border-b whitespace-nowrap">Hành động</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        <tr v-if="loading">
                            <td colspan="9" class="px-4 py-10 text-center">
                                <div class="flex flex-col items-center justify-center gap-3">
                                    <Spinner class="w-6 h-6 text-gray-400" />
                                    <span class="text-sm text-gray-400">Đang tải dữ liệu...</span>
                                </div>
                            </td>
                        </tr>
                        <tr v-else-if="!loading && docs.length === 0">
                            <td colspan="9" class="px-4 py-12 text-center text-gray-500">
                                <div class="flex flex-col items-center justify-center">
                                    <Inbox class="w-12 h-12 text-gray-300 mb-4" />
                                    <p class="text-base text-gray-400">Không có dữ liệu để hiển thị</p>
                                </div>
                            </td>
                        </tr>
                        <tr v-else class="hover:bg-gray-50 transition-colors" v-for="(d, index) in docs" :key="d.id">
                            <td class="px-3 py-1.5 whitespace-nowrap text-center">{{ (pagination.page - 1) * pagination.limit + index + 1 }}</td>
                            <td class="px-3 py-1.5 whitespace-nowrap font-medium">{{ d.soFile }}</td>
                            <td class="px-3 py-1.5 max-w-[260px]">
                                <p class="font-medium truncate">{{ d.tenFile }}</p>
                                <p class="text-[13px] text-slate-500 truncate">{{ d.tenHoSo }} · SL: {{ d.soLuong }} · {{ d.nguoiLuu }}</p>
                            </td>
                            <td class="px-3 py-1.5 whitespace-nowrap tabular-nums text-xs">{{ d.ngayLuu?.slice(0, 10) }}</td>
                            <td class="px-3 py-1.5 whitespace-nowrap">{{ d.department?.name || '---' }}</td>
                            <td class="px-3 py-1.5 whitespace-nowrap">{{ d.viTri }}</td>
                            <td class="px-3 py-1.5 whitespace-nowrap text-xs">
                                {{ loaiThoiGianLabel(d.loaiThoiGian) }}<span v-if="d.thoiGianLuu">: {{ d.thoiGianLuu }}</span>
                                <br /><span :class="isQuaHanHuy(d) ? 'text-red-600 font-medium' : 'text-slate-500'">Hủy: {{ d.thoiGianHuy?.slice(0, 10) || '---' }}</span>
                            </td>
                            <td class="px-3 py-1.5 whitespace-nowrap"><Badge :variant="badgeVariant(d.trangThai)">{{ trangThaiLabel(d.trangThai) }}</Badge></td>
                            <td class="px-3 py-1.5 whitespace-nowrap">
                                <div class="flex gap-1">
                                    <Borrow v-if="can('create', 'BorrowRecord')" :document="d" @success="refreshAll" />
                                    <History v-if="can('read', 'BorrowRecord')" :document="d" @success="refreshAll" />
                                    <ChangeLocation v-if="can('update', 'Document')" :document="d" @success="refreshAll" />
                                    <Edit v-if="can('update', 'Document')" :document="d" @success="refreshAll" />
                                    <Destroy v-if="can('delete', 'Document')" :document="d" @success="refreshAll" />
                                    <Delete v-if="can('delete', 'Document')" :document="d" @success="refreshAll" />
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
                <Button variant="outline" size="icon-sm" :disabled="loading" @click="handleExport" title="Xuất Excel">
                    <FileSpreadsheet class="h-4 w-4 text-green-600" />
                </Button>
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
