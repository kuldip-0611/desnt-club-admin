export type ProductCategory = {
  id: string
  slug: string
  name: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type CreateProductCategoryPayload = {
  slug: string
  name: string
  sortOrder?: number
  isActive?: boolean
}

export type UpdateProductCategoryPayload = Partial<CreateProductCategoryPayload>
