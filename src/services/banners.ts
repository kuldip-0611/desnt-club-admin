import api from './api'

export type Banner = {
  id: string
  title: string
  subtitle?: string
  imageUrl: string
  linkUrl?: string
  position: string
  isActive: boolean
  sortOrder: number
  startsAt?: string
  endsAt?: string
}

export const listBanners = async (): Promise<Banner[]> =>
  api.get('/admin/banners', { params: { page: 1, limit: 100 } }).then(r => r.data?.items ?? r.data ?? [])

/** Create banner — sends multipart/form-data so image file can be included */
export const createBanner = async (data: Partial<Banner>, imageFile?: File): Promise<Banner> => {
  const form = new FormData()
  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') form.append(k, String(v))
  })
  if (imageFile) form.append('image', imageFile)
  return api.post('/admin/banners', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
}

/** Update banner — sends multipart/form-data so image file can be replaced */
export const updateBanner = async (id: string, data: Partial<Banner>, imageFile?: File): Promise<Banner> => {
  const form = new FormData()
  Object.entries(data).forEach(([k, v]) => {
    if (v !== undefined && v !== null) form.append(k, String(v))
  })
  if (imageFile) form.append('image', imageFile)
  return api.patch(`/admin/banners/${id}`, form, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
}

export const deleteBanner = async (id: string): Promise<void> => { await api.delete(`/admin/banners/${id}`) }
