import api from './api'
import baseUrl from '../config'
import type {
  CreateProductCategorySubcategoryPayload,
  ProductCategorySubcategory,
  UpdateProductCategorySubcategoryPayload,
} from '../types/productCategorySubcategory'

export const listProductSubcategoriesByCategory = async (
  categoryId: string,
): Promise<ProductCategorySubcategory[]> => {
  const { data } = await api.get<ProductCategorySubcategory[]>(
    `/admin/product-categories/${categoryId}/subcategories`,
  )
  return data
}

export const createProductCategorySubcategory = async (
  categoryId: string,
  payload: CreateProductCategorySubcategoryPayload,
): Promise<ProductCategorySubcategory> => {
  const form = new FormData()
  form.append('slug', payload.slug)
  form.append('name', payload.name)
  form.append('sortOrder', String(payload.sortOrder ?? 0))
  form.append('isActive', String(payload.isActive ?? true))
  form.append('image', payload.image)
  const { data } = await api.post<ProductCategorySubcategory>(
    `/admin/product-categories/${categoryId}/subcategories`,
    form,
  )
  return data
}

export const updateProductCategorySubcategory = async (
  id: string,
  payload: UpdateProductCategorySubcategoryPayload,
): Promise<ProductCategorySubcategory> => {
  const form = new FormData()
  if (payload.slug !== undefined) form.append('slug', payload.slug)
  if (payload.name !== undefined) form.append('name', payload.name)
  if (payload.sortOrder !== undefined) form.append('sortOrder', String(payload.sortOrder))
  if (payload.isActive !== undefined) form.append('isActive', String(payload.isActive))
  if (payload.image !== undefined) form.append('image', payload.image)
  const { data } = await api.patch<ProductCategorySubcategory>(
    `/admin/product-category-subcategories/${id}`,
    form,
  )
  return data
}

export const deleteProductCategorySubcategory = async (id: string): Promise<void> => {
  await api.delete(`/admin/product-category-subcategories/${id}`)
}

export const subcategoryImageUrl = (path: string | null | undefined): string => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  const root = baseUrl.replace(/\/+$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${root}${p}`
}
