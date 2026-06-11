import api from './api'

export type FlashSale = {
  id: string
  title: string
  discountPercent: number
  startsAt: string
  endsAt: string
  isActive: boolean
  productIds: string[]
}

export const listFlashSales = async (): Promise<FlashSale[]> => api.get('/admin/flash-sales').then(r => r.data)
export const createFlashSale = async (data: Partial<FlashSale>): Promise<FlashSale> => api.post('/admin/flash-sales', data).then(r => r.data)
export const updateFlashSale = async (id: string, data: Partial<FlashSale>): Promise<FlashSale> => api.patch(`/admin/flash-sales/${id}`, data).then(r => r.data)
export const deleteFlashSale = async (id: string): Promise<void> => { await api.delete(`/admin/flash-sales/${id}`) }
