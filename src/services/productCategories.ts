import api from './api'
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
  const { data } = await api.post<ProductCategory>('/admin/product-categories', payload)
  return data
}

export const updateProductCategory = async (
  id: string,
  payload: UpdateProductCategoryPayload,
): Promise<ProductCategory> => {
  const { data } = await api.patch<ProductCategory>(`/admin/product-categories/${id}`, payload)
  return data
}

export const deleteProductCategory = async (id: string): Promise<void> => {
  await api.delete(`/admin/product-categories/${id}`)
}
