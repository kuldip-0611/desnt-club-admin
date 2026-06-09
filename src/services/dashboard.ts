import api from './api'
import type { ProductCategorySummary } from '../types/product'

export type DashboardRecentProduct = {
  id: string
  name: string
  price: number
  quantity: number
  isAvailable: boolean
  updatedAt: string
  image: string | null
  category: ProductCategorySummary | null
}

export type DashboardOverviewResponse = {
  cards: {
    products: number
    availableProducts: number
    lowStockProducts: number
    users: number
    categories: number
    activeCoupons: number
    totalOrders: number
    pendingOrders: number
    pendingReturns: number
  }
  recentProducts: DashboardRecentProduct[]
}

export const getDashboardOverview = async (): Promise<DashboardOverviewResponse> => {
  const { data } = await api.get<DashboardOverviewResponse>('/admin/dashboard/overview')
  return data
}
