import api from './api'
import type {
  CreateUserGroupPayload,
  UpdateUserGroupPayload,
  UserGroupDetail,
  UserGroupSummary,
} from '../types/userGroup'

export const listUserGroups = async (): Promise<UserGroupSummary[]> => {
  const { data } = await api.get<UserGroupSummary[]>('/admin/user-groups')
  return data
}

export const getUserGroup = async (id: string): Promise<UserGroupDetail> => {
  const { data } = await api.get<UserGroupDetail>(`/admin/user-groups/${id}`)
  return data
}

export const createUserGroup = async (payload: CreateUserGroupPayload): Promise<UserGroupSummary> => {
  const { data } = await api.post<UserGroupSummary>('/admin/user-groups', payload)
  return data
}

export const updateUserGroup = async (
  id: string,
  payload: UpdateUserGroupPayload,
): Promise<UserGroupSummary> => {
  const { data } = await api.patch<UserGroupSummary>(`/admin/user-groups/${id}`, payload)
  return data
}

export const deleteUserGroup = async (id: string): Promise<void> => {
  await api.delete(`/admin/user-groups/${id}`)
}

export const addUserToGroup = async (groupId: string, userId: string) => {
  const { data } = await api.post(`/admin/user-groups/${groupId}/members`, { userId })
  return data
}

export const removeUserFromGroup = async (groupId: string, userId: string): Promise<void> => {
  await api.delete(`/admin/user-groups/${groupId}/members/${userId}`)
}

export const assignCouponToGroup = async (groupId: string, couponId: string): Promise<UserGroupDetail> => {
  const { data } = await api.post<UserGroupDetail>(`/admin/user-groups/${groupId}/coupons`, { couponId })
  return data
}

export const unassignCouponFromGroup = async (
  groupId: string,
  couponId: string,
): Promise<UserGroupDetail> => {
  const { data } = await api.delete<UserGroupDetail>(
    `/admin/user-groups/${groupId}/coupons/${couponId}`,
  )
  return data
}
