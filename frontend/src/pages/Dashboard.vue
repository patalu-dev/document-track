<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useBreadcrumb } from '@/composables/useBreadcrumb'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { request } from '@/lib/api'
import { useAuth } from '@/composables/useAuth'
import {
    Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
    Archive, Boxes, AlarmClock, TriangleAlert, Clock, Undo2, Activity, ChevronRight, Loader2,
} from 'lucide-vue-next'

const { can } = useAuth()
const { setBreadcrumbs } = useBreadcrumb()
const router = useRouter()

setBreadcrumbs([
    { title: 'Dashboard', href: '#' },
])

const loading = ref(true)
const stats = ref({ total: 0, luuKho: 0, dangMuon: 0, sapHetHan: 0, quaHanHuy: 0 })
const sapHetHanDocs = ref<any[]>([])
const quaHanDocs = ref<any[]>([])
const quaHanBorrows = ref<any[]>([])
const recentLogs = ref<any[]>([])

const canReadDocuments = computed(() => can('read', 'Document'))
const canReadBorrow = computed(() => can('read', 'BorrowRecord'))
const canReadLogs = computed(() => can('read', 'DocumentLog'))

const fetchAll = async () => {
    loading.value = true
    const safe = async (url: string) => {
        const res = await request(url)
        if (!res.ok) return null
        return await res.json()
    }
    try {
        if (canReadDocuments.value) {
            const s = await safe('/documents/stats/overview')
            if (s) stats.value = s
            const [a, b] = await Promise.all([
                safe('/documents?sapHetHan=true&limit=5'),
                safe('/documents?quaHanHuy=true&limit=5'),
            ])
            if (a) sapHetHanDocs.value = a.items || []
            if (b) quaHanDocs.value = b.items || []
        }
        if (canReadBorrow.value) {
            const c = await safe('/borrow-records?quaHan=true&limit=5')
            if (c) quaHanBorrows.value = c.items || []
        }
        if (canReadLogs.value) {
            const d = await safe('/document-logs?limit=8')
            if (d) recentLogs.value = d.items || []
        }
    } catch {
        /* ignore: dashboard hiển thị dữ liệu rỗng */
    } finally {
        loading.value = false
    }
}

const statCards = computed(() => [
    { key: 'total', label: 'Tổng chứng từ', value: stats.value.total, icon: Archive, class: 'text-blue-600 bg-blue-50', to: '/documents' },
    { key: 'luu_kho', label: 'Lưu kho', value: stats.value.luuKho, icon: Boxes, class: 'text-green-600 bg-green-50', to: '/documents' },
    { key: 'dang_muon', label: 'Đang cho mượn', value: stats.value.dangMuon, icon: Undo2, class: 'text-amber-600 bg-amber-50', to: '/documents' },
    { key: 'sap_het_han', label: 'Sắp đến hạn hủy (30 ngày)', value: stats.value.sapHetHan, icon: Clock, class: 'text-orange-600 bg-orange-50', to: '/documents?sapHetHan=true' },
    { key: 'qua_han_huy', label: 'Quá hạn hủy', value: stats.value.quaHanHuy, icon: AlarmClock, class: 'text-red-600 bg-red-50', to: '/documents?quaHanHuy=true' },
])

const logActionLabel = (a: string) => ({
    them: 'Thêm', sua: 'Sửa', xoa: 'Xóa', doi_vi_tri: 'Đổi vị trí', muon: 'Cho mượn', tra: 'Trả',
}[a] ?? a)

const formatTime = (v: string) => {
    if (!v) return '---'
    return new Date(v).toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    })
}

const logBadgeVariant = (a: string): 'default' | 'outline' | 'destructive' | 'secondary' =>
    (({ them: 'default', sua: 'outline', xoa: 'destructive', doi_vi_tri: 'secondary', muon: 'outline', tra: 'secondary' }[a] ?? 'secondary') as any)

const goto = (to: string) => router.push(to)

onMounted(fetchAll)
</script>

<template>
    <div class="flex flex-1 flex-col gap-4 p-4 pt-3">
        <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div class="flex items-center gap-4">
                <h1 class="text-xl font-semibold">Dashboard</h1>
            </div>
            <Button v-if="loading" variant="ghost" size="sm" disabled>
                <Loader2 class="w-4 h-4 animate-spin" /> Đang tải...
            </Button>
        </div>

        <!-- Thẻ thống kê -->
        <div v-if="canReadDocuments" class="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Card v-for="s in statCards" :key="s.key"
                class="rounded-lg cursor-pointer hover:shadow-md transition-shadow"
                @click="goto(s.to)">
                <CardContent class="flex items-center justify-between h-full">
                    <div>
                        <p class="text-xs text-muted-foreground">{{ s.label }}</p>
                        <p class="text-2xl font-bold mt-1 tabular-nums">{{ s.value }}</p>
                    </div>
                    <div class="w-10 h-10 rounded-md flex items-center justify-center" :class="s.class">
                        <component :is="s.icon" class="w-5 h-5" />
                    </div>
                </CardContent>
            </Card>
        </div>

        <!-- Cảnh báo hạn hủy -->
        <div v-if="canReadDocuments" class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card class="rounded-lg">
                <CardHeader class="pb-3">
                    <CardTitle class="flex items-center gap-2 text-base">
                        <Clock class="w-4 h-4 text-orange-500" /> Sắp đến hạn hủy (&lt; 30 ngày)
                        <Badge class="ml-auto tabular-nums" variant="secondary">{{ sapHetHanDocs.length }} / {{ stats.sapHetHan }}</Badge>
                    </CardTitle>
                    <CardDescription>Chứng từ còn lưu kho, hạn hủy trong vòng 30 ngày tới</CardDescription>
                </CardHeader>
                <CardContent>
                    <div v-if="sapHetHanDocs.length === 0" class="text-sm text-muted-foreground py-4 text-center">Không có chứng từ nào</div>
                    <ul v-else class="divide-y">
                        <li v-for="d in sapHetHanDocs" :key="d.id" class="flex items-center gap-3 py-2 text-sm">
                            <div class="min-w-0 flex-1">
                                <p class="font-medium truncate">{{ d.soFile }}</p>
                                <p class="text-xs text-muted-foreground truncate">{{ d.tenFile }}</p>
                            </div>
                            <span class="text-xs tabular-nums text-slate-500">{{ d.viTri }}</span>
                            <Badge variant="outline" class="tabular-nums">{{ d.thoiGianHuy?.slice(0, 10) }}</Badge>
                        </li>
                    </ul>
                    <Button variant="ghost" size="sm" class="mt-2 ml-auto flex" @click="goto('/documents?sapHetHan=true')">
                        Xem tất cả <ChevronRight class="w-4 h-4" />
                    </Button>
                </CardContent>
            </Card>

            <Card class="rounded-lg">
                <CardHeader class="pb-3">
                    <CardTitle class="flex items-center gap-2 text-base">
                        <TriangleAlert class="w-4 h-4 text-red-500" /> Quá hạn hủy chưa xử lý
                        <Badge class="ml-auto tabular-nums" variant="destructive">{{ quaHanDocs.length }} / {{ stats.quaHanHuy }}</Badge>
                    </CardTitle>
                    <CardDescription>Đã quá hạn hủy, vẫn còn trong kho — cần hủy hoặc di dời</CardDescription>
                </CardHeader>
                <CardContent>
                    <div v-if="quaHanDocs.length === 0" class="text-sm text-muted-foreground py-4 text-center">Không có chứng từ nào</div>
                    <ul v-else class="divide-y">
                        <li v-for="d in quaHanDocs" :key="d.id" class="flex items-center gap-3 py-2 text-sm">
                            <div class="min-w-0 flex-1">
                                <p class="font-medium truncate">{{ d.soFile }}</p>
                                <p class="text-xs text-muted-foreground truncate">{{ d.tenFile }}</p>
                            </div>
                            <span class="text-xs tabular-nums text-slate-500">{{ d.viTri }}</span>
                            <Badge variant="destructive" class="tabular-nums">{{ d.thoiGianHuy?.slice(0, 10) }}</Badge>
                        </li>
                    </ul>
                    <Button variant="ghost" size="sm" class="mt-2 ml-auto flex" @click="goto('/documents?quaHanHuy=true')">
                        Xem tất cả <ChevronRight class="w-4 h-4" />
                    </Button>
                </CardContent>
            </Card>
        </div>

        <!-- Mượn quá hạn + hoạt động gần đây -->
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Card v-if="canReadBorrow" class="rounded-lg">
                <CardHeader class="pb-3">
                    <CardTitle class="flex items-center gap-2 text-base">
                        <Undo2 class="w-4 h-4 text-red-500" /> Mượn quá hạn cần thu hồi
                        <Badge class="ml-auto tabular-nums" variant="destructive">{{ quaHanBorrows.length }}</Badge>
                    </CardTitle>
                    <CardDescription>Đang quản lý {{ stats.dangMuon }} lượt mượn</CardDescription>
                </CardHeader>
                <CardContent>
                    <div v-if="quaHanBorrows.length === 0" class="text-sm text-muted-foreground py-4 text-center">Không có lượt mượn quá hạn</div>
                    <ul v-else class="divide-y">
                        <li v-for="r in quaHanBorrows" :key="r.id" class="flex items-center gap-3 py-2 text-sm">
                            <div class="min-w-0 flex-1">
                                <p class="font-medium truncate">{{ r.document?.soFile }}</p>
                                <p class="text-xs text-muted-foreground truncate">{{ r.nguoiMuon }}<span v-if="r.donViMuon"> — {{ r.donViMuon }}</span></p>
                            </div>
                            <span class="text-xs tabular-nums text-slate-500">Hạn trả</span>
                            <Badge variant="destructive" class="tabular-nums">{{ r.hanTra?.slice(0, 10) }}</Badge>
                        </li>
                    </ul>
                    <Button variant="ghost" size="sm" class="mt-2 ml-auto flex" @click="goto('/borrow-records?quaHan=true')">
                        Xem tất cả <ChevronRight class="w-4 h-4" />
                    </Button>
                </CardContent>
            </Card>

            <Card v-if="canReadLogs" class="rounded-lg">
                <CardHeader class="pb-3">
                    <CardTitle class="flex items-center gap-2 text-base">
                        <Activity class="w-4 h-4 text-blue-500" /> Hoạt động gần đây
                    </CardTitle>
                    <CardDescription>8 dòng nhật ký mới nhất</CardDescription>
                </CardHeader>
                <CardContent>
                    <div v-if="recentLogs.length === 0" class="text-sm text-muted-foreground py-4 text-center">Chưa có thao tác nào</div>
                    <ul v-else class="divide-y">
                        <li v-for="l in recentLogs" :key="l.id" class="flex items-center gap-3 py-2 text-sm">
                            <Badge :variant="logBadgeVariant(l.action)">{{ logActionLabel(l.action) }}</Badge>
                            <div class="min-w-0 flex-1">
                                <p class="truncate">{{ l.soFile }} — {{ l.details }}</p>
                                <p class="text-xs text-muted-foreground truncate">{{ l.actor }}</p>
                            </div>
                            <span class="text-xs text-slate-500 whitespace-nowrap tabular-nums">{{ formatTime(l.createdAt) }}</span>
                        </li>
                    </ul>
                    <Button variant="ghost" size="sm" class="mt-2 ml-auto flex" @click="goto('/document-logs')">
                        Xem tất cả <ChevronRight class="w-4 h-4" />
                    </Button>
                </CardContent>
            </Card>
        </div>

        <!-- Người dùng không có quyền đọc gì -->
        <Card v-if="!loading && !canReadDocuments && !canReadBorrow && !canReadLogs" class="rounded-lg">
            <CardContent class="py-10 text-center text-muted-foreground text-sm">
                Bạn chưa được gán quyền xem báo cáo. Liên hệ quản trị viên để cấp quyền.
            </CardContent>
        </Card>
    </div>
</template>

<style scoped></style>
