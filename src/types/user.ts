export type UserRole = 'USER' | 'ADMIN'
export type AuthProviderType = 'GOOGLE' | 'EMAIL' | 'PHONE'

export type User = {
  id: string
  name: string
  email: string | null
  phone: string | null
  profileImage: string | null
  role: UserRole
  isVerified: boolean
  provider: AuthProviderType
  createdAt: string
  updatedAt: string
}

export type ListUsersParams = {
  page?: number
  limit?: number
  search?: string
  role?: UserRole
  provider?: AuthProviderType
  isVerified?: boolean
}

export type ListUsersResponse = {
  items: User[]
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  summary: {
    total: number
    verified: number
    admins: number
  }
}
