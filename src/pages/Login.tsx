import type { AxiosError } from 'axios'
import type { ReactElement } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { ShoppingBag } from 'lucide-react'
import LoginForm from '../components/LoginForm'
import { useAuth, TOKEN_KEY } from '../hooks/useAuth'
import {
  type ApiErrorShape,
  type LoginPayload,
  type LoginResponse,
  loginRequest,
} from '../services/auth'

const Login = (): ReactElement => {
  const navigate = useNavigate()
  const { saveToken } = useAuth()

  const loginMutation = useMutation<
    LoginResponse,
    AxiosError<ApiErrorShape['response']['data']>,
    LoginPayload
  >({
    mutationFn: loginRequest,
    onSuccess: (data) => {
      saveToken(data.accessToken)
      toast.success('Login successful.')
      navigate('/dashboard', { replace: true })
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Unable to login. Please try again.'
      toast.error(message)
    },
  })

  const initialValues: LoginPayload = {
    email: '',
    password: '',
  }
  const errorMessage = loginMutation.error?.response?.data?.message

  const handleSubmit = (values: LoginPayload): void => {
    loginMutation.mutate(values)
  }

  if (localStorage.getItem(TOKEN_KEY)) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-900/50">
            <ShoppingBag size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Disent Clung Admin</h1>
          <p className="mt-1.5 text-sm text-slate-400">Sign in to access the dashboard.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0d1117]/80 p-8 shadow-2xl backdrop-blur-md">
          <LoginForm
            initialValues={initialValues}
            isLoading={loginMutation.isPending}
            errorMessage={errorMessage}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  )
}

export default Login
