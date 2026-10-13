import { h, computed } from 'vue'
import router from '@/router' 
import { API_BASE_URL } from '@/lib/api-config'
import { toast } from 'vue-sonner'
import { XCircle } from 'lucide-vue-next'
import { user, token, refreshToken, lastActivity, isSessionExpired } from './authState'

const INACTIVITY_ENABLED = import.meta.env.VITE_INACTIVITY_ENABLED !== 'false'
const INACTIVITY_LIMIT = 30 * 60 * 1000 // 30 minutes

export function useAuth() {
  const setAuth = (newUser: any) => {
    user.value = newUser
    isSessionExpired.value = false // Reset expiry state on new login
    localStorage.setItem('user', JSON.stringify(newUser))
    resetInactivityTimer()
  }

  const clearAuth = () => {
    token.value = null
    refreshToken.value = null
    user.value = null
    localStorage.removeItem('user')
    
    router.push({ name: 'login' })
  }

  let refreshPromise: Promise<boolean> | null = null

  const refreshAuthToken = async (): Promise<boolean> => {
    if (!user.value) {
      clearAuth()
      return false
    }

    // Nếu đang có một request refresh khác đang chạy thì chờ nó xong
    if (refreshPromise) {
      return refreshPromise
    }

    refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include', // Important: include cookies (userId lấy từ token trong cookie, không gửi body)
        })

        if (!response.ok) {
          throw new Error('Refresh token invalid')
        }

        // Cookies are automatically updated by the server
        return true
      } catch (err) {
        clearAuth()
        return false
      } finally {
        refreshPromise = null
      }
    })()

    return refreshPromise
  }

  const login = async (username: string, password: string, redirectPath?: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include', // Important: include cookies
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Đăng nhập thất bại')
      }

      setAuth(data.user)

      // Chỉ cho redirect nội bộ, chống open redirect sang domain lạ
      const isSafeRedirect = (t: string) =>
        t.startsWith('/') && !t.startsWith('//') && !t.startsWith('/\\') && !t.includes(':') && !t.includes('\\')
      let target = redirectPath || (router.currentRoute.value.query.redirect as string) || '/dashboard'
      if (!isSafeRedirect(target)) {
        target = '/dashboard'
      }
      
      // Nếu target vẫn là trang login hoặc trang chủ thì mặc định về dashboard
      if (target === '/' || target === '/login' || target.startsWith('/?')) {
        target = '/dashboard'
      }
      
      router.push(target)
      
      return true
    } catch (err: any) {
      toast('Lỗi', {
        description: err.message,
        icon: h(XCircle, { class: 'text-red-500 w-5 h-5' }),
        position: 'top-center',
      })
      return false
    }
  }

  const logout = async (notifyServer = true) => {
    // Sau đổi mật khẩu token đã bị backend vô hiệu (tăng tokenVersion,
    // xóa refreshToken) nên gọi /auth/logout chắc chắn 401 -> bỏ qua.
    if (user.value && notifyServer) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Important: include cookies
        })
      } catch (e) {
        if (import.meta.env.DEV) console.error('Logout failed:', e)
      }
    }
    clearAuth()
  }

  const resetInactivityTimer = () => {
    if (!INACTIVITY_ENABLED || isSessionExpired.value) return
    // memory-only: attacker không sửa được qua localStorage như trước
    lastActivity.value = Date.now()
  }

  const checkInactivity = (silent = false) => {
    if (!INACTIVITY_ENABLED || !user.value || Date.now() - lastActivity.value <= INACTIVITY_LIMIT) return
    if (silent) {
      clearAuth()
    } else {
      isSessionExpired.value = true
    }
  }

  const can = (action: string, subject: string, data?: any) => {
    if (!user.value) return false
    
    try {
      // Helper to check conditions
      const checkConditions = (conditions: any, data: any) => {
        if (!conditions) return true
        if (!data) return false

        try {
          const rawCond = typeof conditions === 'string'
            ? conditions
            : JSON.stringify(conditions);

          let resolvedStr = rawCond.replace(/"\$\{user\.id\}"/g, JSON.stringify(String(user.value.id)));
          resolvedStr = resolvedStr.replace(/"\$\{user\.username\}"/g, JSON.stringify(user.value.username));
          resolvedStr = resolvedStr.replace(/\$\{user\.id\}/g, String(user.value.id));
          resolvedStr = resolvedStr.replace(/\$\{user\.username\}/g, String(user.value.username));

          const condObj = JSON.parse(resolvedStr);
          for (const key in condObj) {
            if (String(data[key]) !== String(condObj[key])) return false
          }
          return true
        } catch (e) {
          return false
        }
      }

      // Flatten all permissions from all roles
      let allPermissions: any[] = []
      
      if (user.value.roles && Array.isArray(user.value.roles)) {
        allPermissions = user.value.roles.flatMap((role: any) => 
          Array.isArray(role.permissions) ? role.permissions : []
        )
      }

      // Fallback nếu permissions nằm trực tiếp trong user
      if (allPermissions.length === 0 && Array.isArray(user.value.permissions)) {
        allPermissions = user.value.permissions
      }

      // 1. Check for ANY 'cannot' (inverted) permissions that match
      const isForbidden = allPermissions.some((p: any) => {
        if (!p.inverted) return false
        const actionMatch = (p.action === 'manage' || p.action === action || (p.action.includes(',') && p.action.split(',').map((a: string) => a.trim()).includes(action)))
        const subjectMatch = (p.subject === 'all' || p.subject === subject)
        return actionMatch && subjectMatch && checkConditions(p.conditions, data)
      })

      if (isForbidden) {
        return false
      }

      // 2. Check for ANY 'can' (regular) permissions that match
      const isAllowed = allPermissions.some((p: any) => {
        if (p.inverted) return false
        const actionMatch = (p.action === 'manage' || p.action === action || (p.action.includes(',') && p.action.split(',').map((a: string) => a.trim()).includes(action)))
        const subjectMatch = (p.subject === 'all' || p.subject === subject)
        return actionMatch && subjectMatch && checkConditions(p.conditions, data)
      })

      if (isAllowed) return true

      return false
    } catch (e) {
      if (import.meta.env.DEV) console.error('Permission check error:', e)
      return false
    }
  }

  return {
    user,
    token,
    login,
    logout,
    refreshAuthToken,
    can,
    checkInactivity,
    resetInactivityTimer,
    isSessionExpired,
    isAuthenticated: computed(() => !!user.value),
    inactivityEnabled: INACTIVITY_ENABLED,
  }
}
