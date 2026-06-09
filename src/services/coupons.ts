import api from './api'
import type {
  Coupon,
  CreateCouponPayload,
  UpdateCouponPayload,
} from '../types/coupon'

export const listCoupons = async (): Promise<Coupon[]> => {
  const { data } = await api.get<Coupon[]>('/admin/coupons')
  return data
}

export const getCoupon = async (id: string): Promise<Coupon> => {
  const { data } = await api.get<Coupon>(`/admin/coupons/${id}`)
  return data
}

export const createCoupon = async (payload: CreateCouponPayload): Promise<Coupon> => {
  const { data } = await api.post<Coupon>('/admin/coupons', payload)
  return data
}

export const updateCoupon = async (
  id: string,
  payload: UpdateCouponPayload,
): Promise<Coupon> => {
  const { data } = await api.patch<Coupon>(`/admin/coupons/${id}`, payload)
  return data
}

export const deleteCoupon = async (id: string): Promise<void> => {
  await api.delete(`/admin/coupons/${id}`)
}
