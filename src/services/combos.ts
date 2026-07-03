import api from './api'

export interface ComboItemPayload {
  productId: string
  variantId?: string | null
  quantity: number
}

export interface CreateComboPayload {
  name: string
  slug?: string
  description?: string
  price: number
  image?: string | null
  isActive: boolean
  startsAt?: string | null
  endsAt?: string | null
  items: ComboItemPayload[]
}

export interface ComboItem {
  id: string
  productId: string
  variantId: string | null
  quantity: number
  product: {
    id: string
    name: string
    slug: string | null
    price: number
    discountPercent: number | null
    images: { path: string }[]
  }
  variant: { id: string; size: string; color: string; quantity: number } | null
}

export interface Combo {
  id: string
  name: string
  slug: string
  description: string | null
  price: number
  image: string | null
  isActive: boolean
  startsAt: string | null
  endsAt: string | null
  createdAt: string
  updatedAt: string
  items: ComboItem[]
}

export const listCombos = async (): Promise<Combo[]> => {
  const { data } = await api.get<Combo[]>('/combos/admin')
  return data
}

export const getCombo = async (id: string): Promise<Combo> => {
  const { data } = await api.get<Combo>(`/combos/admin/${id}`)
  return data
}

export const createCombo = async (payload: CreateComboPayload): Promise<Combo> => {
  const { data } = await api.post<Combo>('/combos/admin', payload)
  return data
}

export const updateCombo = async (id: string, payload: Partial<CreateComboPayload>): Promise<Combo> => {
  const { data } = await api.patch<Combo>(`/combos/admin/${id}`, payload)
  return data
}

export const deleteCombo = async (id: string): Promise<void> => {
  await api.delete(`/combos/admin/${id}`)
}
