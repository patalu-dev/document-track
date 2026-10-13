import { createRouter, createWebHistory } from 'vue-router'
import { user } from '@/composables/authState'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'login',
      component: () => import('@/pages/LoginForm.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/users',
      name: 'users.index',
      component: () => import('@/pages/users/Index.vue'),
      meta: { requiresAuth: true, action: 'view', subject: 'User' },
    },
    {
      path: '/roles',
      name: 'roles.index',
      component: () => import('@/pages/roles/Index.vue'),
      meta: { requiresAuth: true, action: 'view', subject: 'Role' },
    },
    {
      path: '/permissions',
      name: 'permissions.index',
      component: () => import('@/pages/permissions/Index.vue'),
      meta: { requiresAuth: true, action: 'view', subject: 'Permission' },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/pages/Dashboard.vue'),
      meta: { requiresAuth: true, title: 'Dashboard' },
    },
    {
      path: '/change-password',
      name: 'change-password',
      component: () => import('@/pages/ChangePassword.vue'),
      meta: { requiresAuth: true, title: 'Thay đổi mật khẩu' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/pages/NotFound.vue'),
      meta: { requiresAuth: false },
    },
  ],
})

router.beforeEach((to, _from) => {
  if (to.meta.requiresAuth && !user.value) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.name === 'login' && user.value) {
    return { name: 'dashboard' }
  }

  // Enforce phân quyền FE (BE vẫn là chốt chặn): route có meta.action/subject mà không đủ quyền -> dashboard
  const action = to.meta.action as string | undefined
  const subject = to.meta.subject as string | undefined
  if (action && subject && user.value && !hasPermission(user.value, action, subject)) {
    return { name: 'dashboard' }
  }
})

function hasPermission(u: any, action: string, subject: string): boolean {
  try {
    const perms: any[] = Array.isArray(u.roles)
      ? u.roles.flatMap((r: any) => (Array.isArray(r.permissions) ? r.permissions : []))
      : []
    const list = perms.length > 0 ? perms : (Array.isArray(u.permissions) ? u.permissions : [])
    const match = (p: any) =>
      (p.action === 'manage' || p.action === action || (typeof p.action === 'string' && p.action.split(',').map((a: string) => a.trim()).includes(action))) &&
      (p.subject === 'all' || p.subject === subject)
    if (list.some((p) => p.inverted && match(p))) return false
    return list.some((p) => !p.inverted && match(p))
  } catch {
    return false
  }
}

export default router
