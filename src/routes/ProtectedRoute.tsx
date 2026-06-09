import type { ReactElement } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { TOKEN_KEY } from '../hooks/useAuth'

const ProtectedRoute = (): ReactElement => {
  const token = localStorage.getItem(TOKEN_KEY)

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
