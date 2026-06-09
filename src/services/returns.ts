import api from './api'

export type ReturnStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'RECEIVED' | 'REFUNDED'

export type ReturnPayment = {
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
  method: 'ONLINE' | 'COD'
  amount: number
  razorpayPaymentId: string | null
  razorpayRefundId: string | null
  refundedAt: string | null
}

export type ReturnRequest = {
  id: string
  orderId: string
  userId: string
  reason: string
  status: ReturnStatus
  adminNote: string | null
  createdAt: string
  updatedAt: string
  order: {
    id: string
    total: string
    status: string
    user: { id: string; name: string; email: string | null }
    payment: ReturnPayment | null
  }
  user: { id: string; name: string; email: string | null }
}

export type PaginatedReturnsResponse = {
  items: ReturnRequest[]
  total: number
  page: number
  totalPages: number
  hasNextPage: boolean
}

export const listReturns = async (params: {
  page?: number
  limit?: number
  status?: ReturnStatus
}): Promise<PaginatedReturnsResponse> => {
  const { data } = await api.get<PaginatedReturnsResponse>('/admin/returns', { params })
  return data
}

export const updateReturnStatus = async (
  returnId: string,
  payload: { status: ReturnStatus; adminNote?: string },
): Promise<{
  message: string
  refund?: {
    processed: boolean
    mode: 'razorpay' | 'local' | 'cod' | 'none'
    razorpayRefundId?: string
    amount?: number
  }
}> => {
  const { data } = await api.patch(`/admin/returns/${returnId}`, payload)
  return data
}
