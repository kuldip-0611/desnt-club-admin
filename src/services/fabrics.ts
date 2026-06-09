import api from './api'
import type { Fabric } from '../types/fabric'

export const listFabrics = async (): Promise<Fabric[]> => {
  const { data } = await api.get<Fabric[]>('/admin/fabrics')
  return data
}

export const getFabric = async (id: string): Promise<Fabric> => {
  const { data } = await api.get<Fabric>(`/admin/fabrics/${id}`)
  return data
}

export const createFabric = async (payload: {
  slug: string
  name: string
  sortOrder?: number
  isActive?: boolean
}): Promise<Fabric> => {
  const { data } = await api.post<Fabric>('/admin/fabrics', payload)
  return data
}

export const updateFabric = async (
  id: string,
  payload: Partial<{ slug: string; name: string; sortOrder: number; isActive: boolean }>,
): Promise<Fabric> => {
  const { data } = await api.patch<Fabric>(`/admin/fabrics/${id}`, payload)
  return data
}

export const deleteFabric = async (id: string): Promise<void> => {
  await api.delete(`/admin/fabrics/${id}`)
}
