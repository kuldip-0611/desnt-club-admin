import api from './api'
import baseUrl from '../config'
import type {
  CreateProductCategoryPayload,
  ProductCategory,
  UpdateProductCategoryPayload,
} from '../types/productCategory'

export const listProductCategories = async (): Promise<ProductCategory[]> => {
  const { data } = await api.get<ProductCategory[]>('/admin/product-categories')
  return data
}

export const getProductCategory = async (id: string): Promise<ProductCategory> => {
  const { data } = await api.get<ProductCategory>(`/admin/product-categories/${id}`)
  return data
}

export const createProductCategory = async (
  payload: CreateProductCategoryPayload,
): Promise<ProductCategory> => {
  const form = new FormData()
  form.append('slug', payload.slug)
  form.append('name', payload.name)
  form.append('isActive', String(payload.isActive ?? true))
  form.append('image', payload.image)
  const { data } = await api.post<ProductCategory>('/admin/product-categories', form)
  return data
}

export const updateProductCategory = async (
  id: string,
  payload: UpdateProductCategoryPayload,
): Promise<ProductCategory> => {
  const form = new FormData()
  if (payload.slug !== undefined) form.append('slug', payload.slug)
  if (payload.name !== undefined) form.append('name', payload.name)
  if (payload.isActive !== undefined) form.append('isActive', String(payload.isActive))
  if (payload.image !== undefined) form.append('image', payload.image)
  const { data } = await api.patch<ProductCategory>(`/admin/product-categories/${id}`, form)
  return data
}

export const deleteProductCategory = async (id: string): Promise<void> => {
  await api.delete(`/admin/product-categories/${id}`)
}

export const productCategoryImageUrl = (path: string): string => {
  if (path.startsWith('http')) return path
  const root = baseUrl.replace(/\/+$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${root}${p}`
}
