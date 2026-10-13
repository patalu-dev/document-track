<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useBreadcrumb } from '@/composables/useBreadcrumb'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, FileSpreadsheet, Inbox, User } from 'lucide-vue-next'
import Create from './components/Create.vue'
import { request } from '@/lib/api'
import SearchCard from './components/SearchCard.vue'
import { useRouter, useRoute } from 'vue-router'
import { Spinner } from '@/components/ui/spinner'
import Edit from './components/Edit.vue'
import Delete from './components/Delete.vue'
import DeletePermanent from './components/DeletePermanent.vue'
import Restore from './components/Restore.vue'
import ChangeStatus from './components/ChangeStatus.vue'
import ChangePassword from './components/ChangePassword.vue'
import { useAuth } from '@/composables/useAuth'
import { exportUsers } from './lib/exportExcel'
import Badge from '@/components/ui/badge/Badge.vue'

const { user, can } = useAuth()
const { setBreadcrumbs } = useBreadcrumb()
const router = useRouter()
const route = useRoute()

// Breadcrumbs setup
setBreadcrumbs([
    { title: 'Administrator', href: '#' },
    { title: 'Users' },
])

// State
const users = ref<any[]>([])
const loading = ref(false)
const filters = ref({
    name: '',
    username: '',
    email: '',
    role: [] as string[],
    status: '',
})
const pagination = ref({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
})

const showDeleted = ref(route.query.showDeleted === 'true')

// Logic hiển thị tối đa 6 trang với dấu ba chấm
const displayedPages = computed(() => {
    const total = pagination.value.totalPages
    const current = pagination.value.page
    const pages: (number | string)[] = []

    if (total <= 6) {
        for (let i = 1; i <= total; i++) pages.push(i)
        return pages
    }

    if (current <= 3) {
        pages.push(1, 2, 3, 4, '...', total)
    } else if (current >= total - 2) {
        pages.push(1, '...', total - 3, total - 2, total - 1, total)
    } else {
        pages.push(1, '...', current - 1, current, current + 1, '...', total)
    }
    return pages
})
const error = ref<string | null>(null)

// Fetch users from backend
const fetchUsers = async () => {
    // Nếu đang trong quá trình đăng xuất (user bị xóa), không gọi API
    if (!user.value) return

    loading.value = true
    error.value = null
    try {
        const queryParams = new URLSearchParams()

        if (filters.value.name) queryParams.append('name', filters.value.name)
        if (filters.value.username) queryParams.append('username', filters.value.username)
        if (filters.value.email) queryParams.append('email', filters.value.email)
        if (filters.value.role && filters.value.role.length > 0) queryParams.append('role', filters.value.role.join(','))
        if (filters.value.status) queryParams.append('status', filters.value.status)
        if (showDeleted.value) queryParams.append('showDeleted', 'true')
        queryParams.append('page', pagination.value.page.toString())
        queryParams.append('limit', pagination.value.limit.toString())

        const response = await request(`/users?${queryParams.toString()}`)
        if (!response.ok) throw new Error('Failed to fetch users')

        const result = await response.json()
        users.value = result.items || []
        pagination.value.total = result.total || 0
        pagination.value.totalPages = result.totalPages || 0
    } catch (err: any) {
        error.value = err.message
        console.error(err)
    } finally {
        loading.value = false
    }
}

const handleSearch = (newFilters: any) => {
    filters.value = newFilters
    pagination.value.page = 1

    // Update URL
    router.replace({
        query: {
            ...route.query,
            name: filters.value.name || undefined,
            username: filters.value.username || undefined,
            email: filters.value.email || undefined,
            role: (filters.value.role && filters.value.role.length > 0) ? filters.value.role.join(',') : undefined,
            status: filters.value.status || undefined,
            showDeleted: showDeleted.value ? 'true' : undefined,
            page: pagination.value.page.toString(),
        }
    })
}

const toggleDeleted = (value: boolean) => {
    showDeleted.value = value
    pagination.value.page = 1

    // Update URL directly
    router.replace({
        query: {
            ...route.query,
            showDeleted: value ? 'true' : undefined,
            page: '1',
        }
    })
}

const handlePageChange = (newPage: number) => {
    pagination.value.page = newPage

    // Update URL
    router.replace({
        query: {
            ...route.query,
            page: newPage.toString(),
        }
    })
}

const syncFiltersFromUrl = () => {
    filters.value.name = (route.query.name as string) || ''
    filters.value.username = (route.query.username as string) || ''
    filters.value.email = (route.query.email as string) || ''
    const roleQuery = route.query.role as string
    filters.value.role = roleQuery ? roleQuery.split(',').filter(Boolean) : []
    filters.value.status = (route.query.status as string) || ''
    showDeleted.value = route.query.showDeleted === 'true'
    pagination.value.page = route.query.page ? parseInt(route.query.page as string) : 1
}

// Watch for URL changes (back/forward navigation)
watch(() => route.query, () => {
    syncFiltersFromUrl()
    fetchUsers()
})

onMounted(() => {
    syncFiltersFromUrl()
    fetchUsers()
})

const handleExport = async () => {
    await exportUsers(filters.value, showDeleted.value)
}
</script>

<template>
    <div class="flex flex-1 flex-col gap-4 p-4 pt-3">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white px-4 py-3 rounded-lg border border-slate-200/80 shadow-xs">
            <div>
                <div class="flex items-center gap-2">
                <div class="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <User class="w-4 h-4" />
                </div>
                <h1 class="text-xl font-bold text-slate-900">Quản lý tài khoản</h1>
                </div>
                <p class="text-xs text-slate-500 mt-1">Danh sách người dùng hiện tại</p>
            </div>
            <div class="flex items-center gap-2">
                <div class="flex p-1 bg-gray-100 rounded-lg border border-gray-200 mr-2">
                    <button @click="toggleDeleted(false)"
                        :class="['px-3 py-1 text-sm font-medium rounded-md transition-all', !showDeleted ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700']">
                        Người dùng
                    </button>
                    <button @click="toggleDeleted(true)"
                        :class="['px-3 py-1 text-sm font-medium rounded-md transition-all', showDeleted ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700']">
                        Đã xóa
                    </button>
                </div>
                <Create v-if="can('create', 'User')" @success="fetchUsers" />
            </div>
        </div>
        <SearchCard :initial-filters="filters" :loading="loading" @search="handleSearch" />
        <div class="overflow-x-auto border border-gray-200 rounded-lg mt-2 shadow-sm bg-white">
            <div class="w-full overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 text-sm text-left">
                    <thead class="text-gray-700 h-8">
                        <tr>
                            <th class="px-4 py-1 border-b whitespace-nowrap w-12 text-center">STT</th>
                            <th class="px-4 py-1 border-b whitespace-nowrap">Họ tên</th>
                            <th class="px-4 py-1 border-b whitespace-nowrap">Tài khoản</th>
                            <th class="px-4 py-1 border-b whitespace-nowrap">Email</th>
                            <th class="px-4 py-1 border-b whitespace-nowrap">Quyền hạn</th>
                            <th v-if="!showDeleted" class="px-4 py-1 border-b whitespace-nowrap">Trạng thái</th>
                            <th class="px-4 py-1 border-b whitespace-nowrap">Hành động</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
                        <tr v-if="loading">
                            <td :colspan="showDeleted ? 6 : 7" class="px-4 py-10 text-center">
                                <div class="flex flex-col items-center justify-center gap-3">
                                    <Spinner class="w-6 h-6 text-gray-400" />
                                    <span class="text-sm text-gray-400">Đang tải dữ liệu...</span>
                                </div>
                            </td>
                        </tr>
                        <tr v-else-if="!loading && users.length === 0">
                            <td :colspan="showDeleted ? 6 : 7" class="px-4 py-12 text-center text-gray-500">
                                <div class="flex flex-col items-center justify-center">
                                    <Inbox class="w-12 h-12 text-gray-300 mb-4" />
                                    <p class="text-base text-gray-400">Không có dữ liệu để hiển thị</p>
                                </div>
                            </td>
                        </tr>
                        <tr v-else class="hover:bg-gray-50 transition-colors h-10" v-for="(user, index) in users"
                            :key="index">
                            <td class="px-4 py-0.5 whitespace-nowrap text-center">{{ (pagination.page - 1) *
                                pagination.limit +
                                index + 1
                            }}</td>
                            <td class="px-4 py-0.5 whitespace-nowrap">{{ user.name }}</td>
                            <td class="px-4 py-0.5 whitespace-nowrap">{{ user.username }}</td>
                            <td class="px-4 py-0.5 whitespace-nowrap">{{ user.email }}</td>
                            <td class="px-4 py-0.5 whitespace-nowrap">
                                <div class="flex flex-wrap gap-1" v-if="user.roles && user.roles.length > 0">
                                    <Badge v-for="role in user.roles" :key="role.id" variant="secondary">
                                        {{ role.name }}
                                    </Badge>
                                </div>
                                <span v-else>Chưa gán</span>
                            </td>
                            <td v-if="!showDeleted" class="px-4 py-0.5 whitespace-nowrap">
                                <span :class="user.isActive ? 'text-green-600' : 'text-red-600'">
                                    {{ user.isActive ? 'Hoạt động' : 'Khóa' }}
                                </span>
                            </td>
                            <td class="px-4 py-0.5 whitespace-nowrap">
                                <div class="flex gap-1">
                                    <template v-if="!showDeleted">
                                        <ChangeStatus v-if="can('update', 'User')" :user="user" @success="fetchUsers" />
                                        <ChangePassword v-if="can('update', 'User')" :user="user" @success="fetchUsers" />
                                        <Edit v-if="can('update', 'User')" :user="user" @success="fetchUsers" />
                                        <Delete v-if="can('delete', 'User')" :user="user" @success="fetchUsers" />
                                    </template>
                                    <template v-else>
                                        <Restore v-if="can('update', 'User')" :user="user" @success="fetchUsers" />
                                        <DeletePermanent v-if="can('delete', 'User')" :user="user" @success="fetchUsers" />
                                    </template>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Pagination UI -->
        <div class="flex flex-col md:flex-row items-center justify-between px-2">
            <div class="text-sm text-gray-500 md:text-center md:mb-0 mb-4">
                Hiển thị từ {{ (pagination.page - 1) * pagination.limit + 1 }}-{{ Math.min(pagination.page *
                    pagination.limit, pagination.total) }} / {{ pagination.total }} kết quả
            </div>
            <div class="flex items-center gap-2">
                <Button variant="outline" size="icon-sm" :disabled="loading" @click="handleExport">
                    <FileSpreadsheet class="h-4 w-4 text-green-600" />
                </Button>
                <Button variant="outline" size="sm" :disabled="pagination.page <= 1 || loading"
                    @click="handlePageChange(pagination.page - 1)">
                    <ChevronLeft class="h-4 w-4 mr-1" /> Trước
                </Button>

                <div class="flex items-center gap-1">
                    <template v-for="(p, i) in displayedPages" :key="i">
                        <Button v-if="typeof p === 'number'" size="icon-sm"
                            :variant="p === pagination.page ? 'outline' : 'ghost'" @click="handlePageChange(p)"
                            :disabled="loading">
                            {{ p }}
                        </Button>
                        <span v-else class="px-2 text-gray-400">...</span>
                    </template>
                </div>

                <Button variant="outline" size="sm" :disabled="pagination.page >= pagination.totalPages || loading"
                    @click="handlePageChange(pagination.page + 1)">
                    Sau
                    <ChevronRight class="h-4 w-4 ml-1" />
                </Button>
            </div>
        </div>
    </div>
</template>

<style scoped></style>
