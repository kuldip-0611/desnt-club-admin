export type ProductAudience = 'MEN' | 'WOMEN' | 'UNISEX'

export type ProductImage = {
  id: string
  productId?: string
  path: string
  sortOrder: number
  createdAt?: string
}

export type CatalogSizeMeasurements = {
  id: string
  code: string
  name: string | null
  measurementValues: {
    id: string
    value: string
    attribute: { id: string; slug: string; label: string; unit: string | null }
  }[]
}

export type ProductCategorySummary = {
  id: string
  name: string
  slug: string
}

export type FabricSummary = {
  id: string
  name: string
  slug: string
}

export type ProductFabricRow = {
  id: string
  productId: string
  fabricId: string
  percent: number
  fabric: FabricSummary
}

export type ProductMeasurementAttribute = {
  id: string
  slug: string
  label: string
  unit: string | null
  sortOrder: number
}

export type ProductVariant = {
  id: string
  productId: string
  size: string
  sizeId: string | null
  quantity: number
  createdAt: string
  updatedAt: string
  catalogSize: CatalogSizeMeasurements | null
}

export type Product = {
  id: string
  name: string
  description: string | null
  categoryId: string | null
  category: ProductCategorySummary | null
  price: number
  /** 1–100 when a discount is active; null if none */
  discountPercent: number | null
  /** Price after discount (same as `price` when no discount) */
  salePrice: number
  quantity: number
  audience: ProductAudience
  color: string | null
  fabric: string | null
  productFabrics: ProductFabricRow[]
  measurementAttributes: ProductMeasurementAttribute[]
  isAvailable: boolean
  createdAt: string
  updatedAt: string
  images: ProductImage[]
  variants: ProductVariant[]
}

export type UpdateProductPayload = {
  name?: string
  description?: string
  price?: number
  quantity?: number
  audience?: ProductAudience
  color?: string | null
  /** Replaces all blend rows; each percent 1–100, sum 100; [] clears */
  fabrics?: { fabricId: string; percent: number }[]
  /** Replaces linked measurements; [] = none. Non-empty requires catalog size + values on each size. */
  measurementAttributeIds?: string[]
  categoryId?: string | null
  isAvailable?: boolean
  discountPercent?: number | null
  variants?: { size: string; quantity: number; sizeId?: string }[]
}
