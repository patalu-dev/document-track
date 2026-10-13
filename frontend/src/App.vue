<script setup lang="ts">
import AppSidebar from "@/components/AppSidebar.vue";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useBreadcrumb } from "@/composables/useBreadcrumb";
import { Toaster } from "@/components/ui/sonner";
import { ShieldAlert } from 'lucide-vue-next';
import 'vue-sonner/style.css';

import { useRoute } from 'vue-router'
import router from '@/router'
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useAuth } from '@/composables/useAuth'

const { items: breadcrumbItems } = useBreadcrumb();
const route = useRoute()
const { user, resetInactivityTimer, checkInactivity, isSessionExpired, logout, can, inactivityEnabled } = useAuth()

// Lưới an toàn: mất user khi đang ở trang cần auth (đổi pass xong, hết session...)
// thì ép về login, tránh kẹt ở màn hình spinner che toàn trang.
// Riêng trang đổi pass thì không giữ redirect (đổi xong login phải vào dashboard).
watch(user, (v) => {
  if (!v && route.meta.requiresAuth && route.name !== 'login') {
    const query = route.name === 'change-password' ? {} : { redirect: route.fullPath }
    router.replace({ name: 'login', query })
  }
})

const hasPermission = computed(() => {
  if (!route.meta.requiresAuth) return true
  if (!user.value) return false
  if (!route.meta.action || !route.meta.subject) return true
  return can(route.meta.action as string, route.meta.subject as string)
})

const handleSessionExpired = () => {
  isSessionExpired.value = false
  logout()
}

let interval: any = null

onMounted(() => {
  if (inactivityEnabled) {
    checkInactivity(true)
    interval = setInterval(checkInactivity, 60 * 1000)
    window.addEventListener('mousemove', resetInactivityTimer)
    window.addEventListener('keydown', resetInactivityTimer)
    window.addEventListener('click', resetInactivityTimer)
  }
})

onUnmounted(() => {
  if (interval) clearInterval(interval)
  window.removeEventListener('mousemove', resetInactivityTimer)
  window.removeEventListener('keydown', resetInactivityTimer)
  window.removeEventListener('click', resetInactivityTimer)
})

const isAuthPage = computed(() => {
  // If no user, we must be on auth page
  if (!user.value) return true

  // Even with user, if we are explicitly on the login route or home, it's an auth page
  // (though the router should redirect us away)
  return route.name === 'login' || route.path === '/'
})
</script>

<template>
  <Toaster />

  <template v-if="isAuthPage">
    <!-- Luôn giữ RouterView trong DOM để Router có thể thực hiện việc chuyển trang -->
    <RouterView v-show="!route.meta.requiresAuth" :key="route.path" />

    <!-- Hiển thị spinner che đi nội dung nếu URL hiện tại vẫn là trang yêu cầu auth nhưng đã mất token, trừ khi đang ở trang login -->
    <div v-if="route.meta.requiresAuth && route.name !== 'login'"
      class="flex h-screen w-screen items-center justify-center bg-background fixed inset-0 z-50">
      <div class="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
    </div>
  </template>

  <SidebarProvider v-else>
    <AppSidebar />
    <SidebarInset>
      <header class="flex h-12 shrink-0 items-center gap-2">
        <div class="flex items-center gap-2 px-4">
          <SidebarTrigger class="-ml-1" />
          <Separator orientation="vertical" class="mr-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <template v-for="(item, index) in breadcrumbItems" :key="item.title">
                <BreadcrumbItem>
                  <BreadcrumbPage v-if="index === breadcrumbItems.length - 1">
                    {{ item.title }}
                  </BreadcrumbPage>
                  <BreadcrumbLink v-else :href="item.href ?? '#'">
                    {{ item.title }}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator v-if="index < breadcrumbItems.length - 1" />
              </template>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <hr class="border-border" />

      <main class="flex-1 flex flex-col overflow-hidden bg-gray-100">
        <template v-if="hasPermission">
          <RouterView :key="route.path" />
        </template>
        <div v-else class="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/50">
          <div class="max-w-md mx-auto flex flex-col items-center">
            <div class="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <ShieldAlert class="w-10 h-10 text-red-500" />
            </div>
            <h2 class="text-2xl font-bold text-gray-900 mb-3">Truy cập bị từ chối</h2>
            <p class="text-gray-600 mb-8 leading-relaxed">
              Bạn không có quyền truy cập vào chức năng này. <br>Vui lòng liên hệ quản trị viên để được cấp quyền. </p>
          </div>
        </div>
      </main>
    </SidebarInset>
  </SidebarProvider>

  <AlertDialog v-if="inactivityEnabled" :open="isSessionExpired">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Phiên làm việc hết hạn</AlertDialogTitle>
        <AlertDialogDescription>
          Bạn đã không hoạt động trong một thời gian dài. Vui lòng đăng nhập lại để tiếp tục sử dụng hệ thống.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogAction @click="handleSessionExpired">Đăng nhập lại</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
