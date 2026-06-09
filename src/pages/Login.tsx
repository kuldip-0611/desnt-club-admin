import type { AxiosError } from 'axios'
import type { ReactElement } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
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
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Admin Login</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to access dashboard controls.</p>
        </div>

        <LoginForm
          initialValues={initialValues}
          isLoading={loginMutation.isPending}
          errorMessage={errorMessage}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}

export default Login
