export type ProductCategorySubcategory = {
  id: string
  categoryId: string
  slug: string
  name: string
  image: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type CreateProductCategorySubcategoryPayload = {
  slug: string
  name: string
  sortOrder?: number
  isActive?: boolean
  image: File
}

export type UpdateProductCategorySubcategoryPayload = {
  slug?: string
  name?: string
  sortOrder?: number
  isActive?: boolean
  image?: File
}
