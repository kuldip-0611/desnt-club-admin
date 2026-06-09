import api from './api'

type LoginPayload = {
  email: string
  password: string
}

type LoginResponse = {
  accessToken: string
  refreshToken: string
}

type ApiErrorShape = {
  response: {
    status: number
    data: {
      message: string
    }
  }
}

export const loginRequest = async (payload: LoginPayload): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/auth/admin/login', payload)

  return response.data
}

export type { LoginPayload, LoginResponse, ApiErrorShape }
