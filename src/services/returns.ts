import api from './api'

export type ReturnStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'RECEIVED' | 'REFUNDED' | 'EXCHANGED'

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
  type?: 'RETURN' | 'EXCHANGE'
  exchangeSize?: string | null
  orderItemId?: string | null
  status: ReturnStatus
  adminNote: string | null
  // Shiprocket reverse pickup
  returnShiprocketOrderId?: string | null
  returnShipmentId?: string | null
  returnAwbCode?: string | null
  returnCourierName?: string | null
  // Shiprocket exchange forward
  exchangeShiprocketOrderId?: string | null
  exchangeShipmentId?: string | null
  exchangeAwbCode?: string | null
  exchangeCourierName?: string | null
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

export const getReturn = async (id: string): Promise<ReturnRequest> => {
  const { data } = await api.get<ReturnRequest>(`/admin/returns/${id}`)
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
