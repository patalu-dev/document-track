<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useBreadcrumb } from '@/composables/useBreadcrumb'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Inbox, Search, HandHelping, Undo2, Loader2 } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import Badge from '@/components/ui/badge/Badge.vue'
import { request } from '@/lib/api'
import { useRouter, useRoute } from 'vue-router'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/composables/useAuth'
import { h } from 'vue'
import { toast } from 'vue-sonner'
import { CheckCircle, XCircle } from 'lucide-vue-next'

const { user, can } = useAuth()
const { setBreadcrumbs } = useBreadcrumb()
const router = useRouter()
const route = useRoute()

setBreadcrumbs([
    { title: 'Kho lưu trữ', href: '#' },
    { title: 'Mượn trả' },
])

const records = ref<any[]>([])
const loading = ref(false)
const filters = ref({ keyword: '' })
const pagination = ref({ page: 1, limit: 10, total: 0, totalPages: 0 })
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

const fetchRecords = async () => {
    if (!user.value) return
    loading.value = true
    try {
        const qp = new URLSearchParams()
        if (filters.value.keyword) qp.append('keyword', filters.value.keyword)
        qp.append('trangThai', 'dang_muon')
        qp.append('order', 'desc')
        qp.append('page', pagination.value.page.toString())
        qp.append('limit', pagination.value.limit.toString())
        const res = await request(`/borrow-records?${qp.toString()}`)
        if (!res.ok) throw new Error('Không tải được lịch sử mượn trả')
        const data = await res.json()
        records.value = data.items || []
        pagination.value.total = data.total || 0
        pagination.value.totalPages = data.totalPages || 0
    } catch (e: any) {
        console.error(e)
    } finally {
        loading.value = false
    }
}

const syncFromUrl = () => {
    filters.value.keyword = (route.query.keyword as string) || ''
    pagination.value.page = route.query.page ? parseInt(route.query.page as string) : 1
}

watch(() => filters.value.keyword, (v) => {
    if (searchTimeout) clearTimeout(searchTimeout)
    if (v === (route.query.keyword || '')) return
    searchTimeout = setTimeout(() => {
        router.replace({ query: { ...route.query, keyword: v || undefined, page: '1' } })
    }, 500)
})

watch(() => route.query, () => { syncFromUrl(); fetchRecords() }, { deep: true })

onMounted(() => { syncFromUrl(); fetchRecords() })

const returningId = ref<number | null>(null)
const handleReturn = async (id: number) => {
    returningId.value = id
    try {
        const res = await request(`/borrow-records/${id}/return`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ngayTraThucTe: new Date().toISOString().split('T')[0] }),
        })
        if (!res.ok) {
            const e = await res.json()
            throw new Error(e.message || 'Lỗi khi trả')
        }
        toast('Thông báo', { description: 'Trả chứng từ thành công', icon: h(CheckCircle, { class: 'text-green-500 w-5 h-5' }), position: 'top-center' })
        fetchRecords()
    } catch (err: any) {
        toast('Lỗi', { description: err.message, icon: h(XCircle, { class: 'text-red-500 w-5 h-5' }), position: 'top-center' })
    } finally {
        returningId.value = null
    }
}

const isOverdue = (r: any) => r.trangThai !== 'da_tra' && r.hanTra?.slice(0, 10) < new Date().toISOString().split('T')[0]
</script>

<template>
    <div class="flex flex-1 flex-col gap-4 p-4 pt-3">
        <div class="flex flex-col gap-3 bg-white px-4 py-3 rounded-lg border border-slate-200/80 shadow-xs">
            <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <HandHelping class="w-4 h-4" />
                </div>
                <div>
                    <h1 class="text-xl font-bold text-slate-900">Quản lý mượn — trả</h1>
                    <p class="text-xs text-slate-500 mt-0.5">Theo dõi chứng từ đang cho mượn và quá hạn</p>
                </div>
            </div>
            <div class="relative w-full md:w-1/2">
                <Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input v-model="filters.keyword" placeholder="Tìm người mượn, số file, tên file..." class="pl-8 h-9 shadow-none bg-white" />
            </div>
        </div>

        <div class="overflow-x-auto border border-gray-200 rounded-lg shadow-sm bg-white">
            <div class="w-full overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 text-sm text-left">
                    <thead class="text-gray-700 font-medium h-8">
                        <tr>
                            <th class="px-3 py-1 border-b w-12 text-center">STT</th>
                            <th class="px-3 py-1 border-b">Chứng từ</th>
                            <th class="px-3 py-1 border-b">Người mượn</th>
                            <th class="px-3 py-1 border-b">Ngày mượn</th>
                            <th class="px-3 py-1 border-b">Hạn trả</th>
                            <th class="px-3 py-1 border-b">Ngày trả</th>
                            <th class="px-3 py-1 border-b">Trạng thái</th>
                            <th class="px-3 py-1 border-b">Hành động</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        <tr v-if="loading">
                            <td colspan="8" class="px-4 py-10 text-center">
                                <div class="flex flex-col items-center justify-center gap-3">
                                    <Spinner class="w-6 h-6 text-gray-400" />
                                    <span class="text-sm text-gray-400">Đang tải dữ liệu...</span>
                                </div>
                            </td>
                        </tr>
                        <tr v-else-if="!loading && records.length === 0">
                            <td colspan="8" class="px-4 py-12 text-center text-gray-500">
                                <div class="flex flex-col items-center justify-center">
                                    <Inbox class="w-12 h-12 text-gray-300 mb-4" />
                                    <p class="text-base text-gray-400">Không có dữ liệu để hiển thị</p>
                                </div>
                            </td>
                        </tr>
                        <tr v-else class="hover:bg-gray-50" v-for="(r, i) in records" :key="r.id">
                            <td class="px-3 py-1.5 text-center">{{ (pagination.page - 1) * pagination.limit + i + 1 }}</td>
                            <td class="px-3 py-1.5"><span class="font-medium">{{ r.document?.soFile }}</span><br /><span class="text-xs text-slate-500">{{ r.document?.tenFile }}</span></td>
                            <td class="px-3 py-1.5">{{ r.nguoiMuon }}<span v-if="r.donViMuon" class="text-xs text-slate-500"><br />{{ r.donViMuon }}</span></td>
                            <td class="px-3 py-1.5">{{ r.ngayMuon?.slice(0, 10) }}</td>
                            <td class="px-3 py-1.5" :class="isOverdue(r) ? 'text-red-600 font-semibold' : ''">{{ r.hanTra?.slice(0, 10) }}</td>
                            <td class="px-3 py-1.5">{{ r.ngayTraThucTe?.slice(0, 10) || '---' }}</td>
                            <td class="px-3 py-1.5">
                                <Badge v-if="isOverdue(r)" variant="destructive">Quá hạn</Badge>
                                <Badge v-else>Đang mượn</Badge>
                            </td>
                            <td class="px-3 py-1.5">
                                <Button v-if="r.trangThai !== 'da_tra' && can('update', 'BorrowRecord')" variant="outline" size="sm" class="h-7" :disabled="returningId === r.id" @click="handleReturn(r.id)">
                                    <Loader2 v-if="returningId === r.id" class="w-3 h-3 mr-1 animate-spin" />
                                    <Undo2 v-else class="w-3 h-3 mr-1" /> Trả
                                </Button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="flex flex-col md:flex-row items-center justify-between px-2">
            <div class="text-sm text-gray-500">Hiển thị {{ records.length }} / {{ pagination.total }} kết quả</div>
            <div class="flex items-center gap-2">
                <Button variant="outline" size="sm" :disabled="pagination.page <= 1 || loading" @click="router.replace({ query: { ...route.query, page: String(pagination.page - 1) } })">
                    <ChevronLeft class="h-4 w-4 mr-1" /> Trước
                </Button>
                <div class="flex items-center gap-1">
                    <template v-for="(p, i) in displayedPages" :key="i">
                        <Button v-if="typeof p === 'number'" size="icon-sm" :variant="p === pagination.page ? 'outline' : 'ghost'" @click="router.replace({ query: { ...route.query, page: String(p) } })" :disabled="loading">{{ p }}</Button>
                        <span v-else class="px-2 text-gray-400">...</span>
                    </template>
                </div>
                <Button variant="outline" size="sm" :disabled="pagination.page >= pagination.totalPages || loading" @click="router.replace({ query: { ...route.query, page: String(pagination.page + 1) } })">
                    Sau <ChevronRight class="h-4 w-4 ml-1" />
                </Button>
            </div>
        </div>
    </div>
</template>
