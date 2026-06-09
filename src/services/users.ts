import api from './api'
import type {
  CouponValidationResult,
  UserAdminDetail,
  UserAvailableCoupon,
} from '../types/userAdmin'
import type { ListUsersParams, ListUsersResponse, User } from '../types/user'

export const listUsers = async (params: ListUsersParams = {}): Promise<ListUsersResponse> => {
  const { data } = await api.get<ListUsersResponse>('/admin/users', { params })
  return data
}

export const getUserAdminDetail = async (id: string): Promise<UserAdminDetail> => {
  const { data } = await api.get<UserAdminDetail>(`/admin/users/${id}`)
  return data
}

export const listUserAvailableCoupons = async (userId: string): Promise<UserAvailableCoupon[]> => {
  const { data } = await api.get<UserAvailableCoupon[]>(`/admin/users/${userId}/available-coupons`)
  return data
}

export const assignCouponToUser = async (userId: string, couponId: string): Promise<UserAdminDetail> => {
  const { data } = await api.post<UserAdminDetail>(`/admin/users/${userId}/coupons`, { couponId })
  return data
}

export const unassignCouponFromUser = async (userId: string, couponId: string): Promise<UserAdminDetail> => {
  const { data } = await api.delete<UserAdminDetail>(`/admin/users/${userId}/coupons/${couponId}`)
  return data
}

export const validateCouponForUser = async (
  userId: string,
  payload: { code: string; subtotal?: number; categoryIds?: string[] },
): Promise<CouponValidationResult> => {
  const { data } = await api.post<CouponValidationResult>(
    `/admin/users/${userId}/validate-coupon`,
    payload,
  )
  return data
}

export const updateUserByAdmin = async (
  id: string,
  payload: { role?: 'USER' | 'ADMIN'; isVerified?: boolean },
): Promise<User> => {
  const { data } = await api.patch<User>(`/admin/users/${id}`, payload)
  return data
}
