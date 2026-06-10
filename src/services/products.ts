import baseUrl from '../config'
import api from './api'
import type { Product, UpdateProductPayload } from '../types/product'

export type ListProductsParams = {
  page?: number
  limit?: number
  search?: string
}

export type PaginatedProductsResponse = {
  items: Product[]
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  summary: {
    total: number
    available: number
    lowStock: number
  }
}

export const listProducts = async (
  params: ListProductsParams = {},
): Promise<PaginatedProductsResponse> => {
  const { data } = await api.get<PaginatedProductsResponse>('/admin/products', { params })
  return data
}

export const getProduct = async (id: string): Promise<Product> => {
  const { data } = await api.get<Product>(`/admin/products/${id}`)
  return data
}

export const createProduct = async (formData: FormData): Promise<Product> => {
  const { data } = await api.post<Product>('/admin/products', formData, {
    timeout: 120_000,
  })
  return data
}

export const updateProduct = async (id: string, payload: UpdateProductPayload): Promise<Product> => {
  const { data } = await api.patch<Product>(`/admin/products/${id}`, payload)
  return data
}

export const appendProductImages = async (id: string, formData: FormData): Promise<Product> => {
  const { data } = await api.post<Product>(`/admin/products/${id}/images`, formData, {
    timeout: 120_000,
  })
  return data
}

export const deleteProductImage = async (productId: string, imageId: string): Promise<Product> => {
  const { data } = await api.delete<Product>(`/admin/products/${productId}/images/${imageId}`)
  return data
}

export const updateProductImageColor = async (
  productId: string,
  imageId: string,
  color: string,
): Promise<Product> => {
  const { data } = await api.patch<Product>(`/admin/products/${productId}/images/${imageId}/color`, { color })
  return data
}

export const reorderProductImages = async (
  productId: string,
  order: { id: string; sortOrder: number }[],
): Promise<void> => {
  await api.patch(`/admin/products/${productId}/images/reorder`, { order })
}

export const deleteProduct = async (id: string): Promise<void> => {
  await api.delete(`/admin/products/${id}`)
}

/** Full URL for an uploaded image path like `/uploads/products/...` */
export const productImageUrl = (path: string): string => {
  if (path.startsWith('http')) {
    return path
  }
  const root = baseUrl.replace(/\/+$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${root}${p}`
}
