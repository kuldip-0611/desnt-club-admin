import api from './api'

export type OrderUser = {
  id: string
  name: string
  email: string | null
}

export type OrderPayment = {
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  method?: 'ONLINE' | 'COD'
}

export type OrderReturnSummary = {
  id: string
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'RECEIVED' | 'REFUNDED'
  createdAt: string
}

export type Order = {
  id: string
  userId: string
  user: OrderUser
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED'
  subtotal: string
  discountAmount: string
  total: string
  createdAt: string
  updatedAt: string
  payment: OrderPayment | null
  returnRequests: OrderReturnSummary[]
  _count: { items: number }
}

export type PaginatedOrdersResponse = {
  items: Order[]
  total: number
  page: number
  totalPages: number
  hasNextPage: boolean
}

export const listOrders = async (params: {
  page?: number
  limit?: number
  status?: string
  search?: string
}): Promise<PaginatedOrdersResponse> => {
  const { data } = await api.get<PaginatedOrdersResponse>('/admin/orders', { params })
  return data
}

export const updateOrderStatus = async (
  orderId: string,
  status: Order['status'],
): Promise<{ message: string }> => {
  const { data } = await api.patch<{ message: string }>(`/admin/orders/${orderId}/status`, { status })
  return data
}
