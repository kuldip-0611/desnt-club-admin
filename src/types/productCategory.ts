export type ProductCategory = {
  id: string
  slug: string
  name: string
  image: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count?: {
    subcategories: number
    products: number
  }
}

export type CreateProductCategoryPayload = {
  slug: string
  name: string
  image: File
  isActive?: boolean
}

export type UpdateProductCategoryPayload = {
  slug?: string
  name?: string
  image?: File
  isActive?: boolean
}
