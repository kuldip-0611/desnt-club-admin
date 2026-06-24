import api from './api'

export type GiftCard = {
  id: string
  code: string
  initialAmount: number
  balance: number
  recipientEmail: string
  recipientName?: string | null
  isActive: boolean
  expiresAt: string | null
  createdAt: string
  purchasedBy?: { id: string; name: string; email: string } | null
}

type GiftCardListResponse = {
  items: GiftCard[]
  total: number
  page: number
  totalPages: number
}

export async function listGiftCards(page = 1, limit = 20): Promise<GiftCardListResponse> {
  const res = await api.get(`/admin/gift-cards?page=${page}&limit=${limit}`)
  return res.data
}

export async function deactivateGiftCard(id: string): Promise<void> {
  await api.patch(`/admin/gift-cards/${id}/deactivate`)
}
