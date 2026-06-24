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

type ApiBundle = Omit<Bundle, 'productIds'> & { products?: { productId: string }[] }

const normalise = (b: ApiBundle): Bundle => ({
  ...b,
  productIds: (b.products ?? []).map((p) => p.productId),
})

export const listBundles = async (): Promise<Bundle[]> => {
  const { data } = await api.get<ApiBundle[]>('/admin/bundles')
  return (data ?? []).map(normalise)
}

export const createBundle = async (payload: CreateBundlePayload): Promise<Bundle> => {
  const { data } = await api.post<ApiBundle>('/admin/bundles', payload)
  return normalise(data)
}

export const updateBundle = async (id: string, payload: UpdateBundlePayload): Promise<Bundle> => {
  const { data } = await api.patch<ApiBundle>(`/admin/bundles/${id}`, payload)
  return normalise(data)
}

export const deleteBundle = async (id: string): Promise<void> => {
  await api.delete(`/admin/bundles/${id}`)
}
