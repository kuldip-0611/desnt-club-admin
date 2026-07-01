import api from './api'
import baseUrl from '../config'
import { TOKEN_KEY } from '../hooks/useAuth'

export type OrderUser = {
  id: string
  name: string
  email: string | null
}

export type OrderPayment = {
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  method?: 'ONLINE' | 'COD'
  amount?: number
  razorpayRefundId?: string | null
}

export type OrderItem = {
  id: string
  productId: string
  variantId: string | null
  quantity: number
  price: string
  size: string | null
  color: string | null
  product: {
    id: string
    name: string
    images: { path: string }[]
  }
}

export type OrderDetail = {
  id: string
  userId: string
  user: OrderUser
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED'
  subtotal: string
  discountAmount: string
  total: string
  cancelReason: string | null
  shippingAddress: Record<string, string> | null
  awbCode: string | null
  courierName: string | null
  shiprocketShipmentId: string | null
  shippingStatus: string | null
  createdAt: string
  updatedAt: string
  payment: OrderPayment | null
  coupon: { code: string; discountType: string; value: string } | null
  items: OrderItem[]
  returnRequests: {
    id: string
    status: string
    type: string
    reason: string
    createdAt: string
  }[]
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
  shiprocketShipmentId: string | null
  awbCode: string | null
  shippingStatus: string | null
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

export const downloadPackingSlip = async (orderId: string): Promise<void> => {
  const token = localStorage.getItem(TOKEN_KEY) ?? ''
  const url = `${baseUrl}admin/orders/${orderId}/packing-slip`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error('Failed to download packing slip')
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = `packing-slip-${orderId.slice(-8).toUpperCase()}.pdf`
  a.click()
  URL.revokeObjectURL(objectUrl)
}

export const downloadShippingLabel = async (orderId: string): Promise<void> => {
  const token = localStorage.getItem(TOKEN_KEY) ?? ''
  const res = await fetch(`${baseUrl}admin/orders/${orderId}/shipping-label`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message ?? 'Failed to get label')
  }
  const { labelUrl } = await res.json() as { labelUrl: string }
  window.open(labelUrl, '_blank')
}

export const downloadGeneratedLabel = async (orderId: string): Promise<void> => {
  const token = localStorage.getItem(TOKEN_KEY) ?? ''
  const res = await fetch(`${baseUrl}admin/orders/${orderId}/generate-label`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message ?? 'Failed to generate label')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `shipping-label-${orderId.slice(-8).toUpperCase()}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export const markCodRemitted = async (
  orderId: string,
  remittanceRef?: string,
): Promise<{ message: string }> => {
  const { data } = await api.patch<{ message: string }>(`/admin/orders/${orderId}/cod-remittance`, {
    remittanceRef,
  })
  return data
}

export const getOrder = async (orderId: string): Promise<OrderDetail> => {
  const { data } = await api.get<OrderDetail>(`/admin/orders/${orderId}`)
  return data
}
