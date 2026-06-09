import { useMemo } from 'react'

const TOKEN_KEY = 'auth_token' as const

type UseAuthReturn = {
  token: string | null
  isAuthenticated: boolean
  saveToken: (value: string) => void
  removeToken: () => void
}

export const useAuth = (): UseAuthReturn => {
  const token = useMemo(() => localStorage.getItem(TOKEN_KEY), [])

  const saveToken = (value: string) => {
    localStorage.setItem(TOKEN_KEY, value)
  }

  const removeToken = () => {
    localStorage.removeItem(TOKEN_KEY)
  }

  const isAuthenticated = Boolean(token || localStorage.getItem(TOKEN_KEY))

  return {
    token,
    isAuthenticated,
    saveToken,
    removeToken,
  }
}

export { TOKEN_KEY }
