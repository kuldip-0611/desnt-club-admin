import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
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
