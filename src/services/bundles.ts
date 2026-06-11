import api from './api'

export type BundleDiscountType = 'PERCENT' | 'FLAT'

export interface Bundle {
  id: string
  name: string
  description: string | null
  discountType: BundleDiscountType
  discountValue: number
  minItems: number
  productIds: string[]
  isActive: boolean
  startsAt: string | null
  endsAt: string | null
  createdAt: string
  updatedAt: string
}

export type CreateBundlePayload = {
  name: string
  description?: string
  discountType: BundleDiscountType
  discountValue: number
  minItems?: number
  productIds: string[]
  isActive?: boolean
  startsAt?: string
  endsAt?: string
}

export type UpdateBundlePayload = Partial<CreateBundlePayload>

export const listBundles = async (): Promise<Bundle[]> => {
  const { data } = await api.get<Bundle[]>('/admin/bundles')
  return data
}

export const createBundle = async (payload: CreateBundlePayload): Promise<Bundle> => {
  const { data } = await api.post<Bundle>('/admin/bundles', payload)
  return data
}

export const updateBundle = async (id: string, payload: UpdateBundlePayload): Promise<Bundle> => {
  const { data } = await api.patch<Bundle>(`/admin/bundles/${id}`, payload)
  return data
}

export const deleteBundle = async (id: string): Promise<void> => {
  await api.delete(`/admin/bundles/${id}`)
}
