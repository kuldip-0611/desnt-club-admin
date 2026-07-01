import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig, isAxiosError } from 'axios'

/** Extracts the human-readable error message from an API error response */
export const apiErrorMessage = (err: unknown, fallback = 'Something went wrong'): string => {
  if (isAxiosError(err)) {
    const data = err.response?.data as { message?: string | string[] } | undefined
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message
    }
  }
  if (err instanceof Error) return err.message
  return fallback
}
import baseUrl from '../config'
import { TOKEN_KEY } from '../hooks/useAuth'

const api = axios.create({
  baseURL: baseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

api.interceptors.request.use((request: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(TOKEN_KEY)

  if (token) {
    request.headers.Authorization = `Bearer ${token}`
  }

  if (request.data instanceof FormData) {
    request.headers.delete('Content-Type')
  }

  return request
})

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const url = error.config?.url ?? ''
      const isAdminLogin = url.includes('/auth/admin/login')
      const onLoginPage = window.location.pathname.startsWith('/login')
      if (!isAdminLogin && !onLoginPage) {
        localStorage.removeItem(TOKEN_KEY)
        window.location.replace('/login')
      }
    }
    return Promise.reject(error)
  },
)

export default api
