import { useAuth } from '@/composables/useAuth'
import { API_BASE_URL } from './api-config'

export async function request(path: string, options: RequestInit = {}) {
  const { logout, refreshAuthToken, resetInactivityTimer } = useAuth()
  
  const headers = new Headers(options.headers || {})
  
  let response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include', // Important: include cookies for all requests
  })

  // Reset timer on active response
  if (response.ok) {
    resetInactivityTimer()
  }
  
  if (response.status === 401 && path !== '/auth/login' && path !== '/auth/refresh') {
    const refreshed = await refreshAuthToken()
    
    if (refreshed) {
      // Retry the original request (cookies are automatically included).
      // Trả response cho caller tự xử lý: nếu retry vẫn 401/400 (lỗi nghiệp vụ
      // như sai currentPassword) thì KHÔNG được logout ở đây.
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
        credentials: 'include',
      })

      if (response.ok) {
        resetInactivityTimer()
      }
      return response
    }
    
    logout()
    throw new Error('Phiên làm việc hết hạn hoặc chưa xác thực')
  }
  
  return response
}
