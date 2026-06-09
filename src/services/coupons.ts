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

export const assignCouponToUser = async (couponId: string, userId: string): Promise<Coupon> => {
  const { data } = await api.post<Coupon>(`/admin/coupons/${couponId}/users`, { userId })
  return data
}

export const unassignCouponFromUser = async (
  couponId: string,
  userId: string,
): Promise<Coupon> => {
  const { data } = await api.delete<Coupon>(`/admin/coupons/${couponId}/users/${userId}`)
  return data
}

export const assignCouponToGroup = async (
  couponId: string,
  userGroupId: string,
): Promise<Coupon> => {
  const { data } = await api.post<Coupon>(`/admin/coupons/${couponId}/user-groups`, {
    userGroupId,
  })
  return data
}

export const unassignCouponFromGroup = async (
  couponId: string,
  userGroupId: string,
): Promise<Coupon> => {
  const { data } = await api.delete<Coupon>(
    `/admin/coupons/${couponId}/user-groups/${userGroupId}`,
  )
  return data
}
