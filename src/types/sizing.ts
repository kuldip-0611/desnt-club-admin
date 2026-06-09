export type MeasurementAttribute = {
  id: string
  slug: string
  label: string
  unit: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type SizeMeasurementRow = {
  id: string
  sizeId: string
  attributeId: string
  value: string
  attribute: MeasurementAttribute
}

export type Size = {
  id: string
  code: string
  name: string | null
  sortOrder: number
  /** Typical unit for numbers in this size chart (optional) */
  valueUnit: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  measurementValues: SizeMeasurementRow[]
}

export type CreateMeasurementAttributePayload = {
  slug: string
  label: string
  unit?: 'cm' | 'in' | null
  sortOrder?: number
  isActive?: boolean
}

export type UpdateMeasurementAttributePayload = Partial<CreateMeasurementAttributePayload>

export type SizeMeasurementInput = {
  attributeId: string
  value: string
}

export type CreateSizePayload = {
  code: string
  name?: string
  sortOrder?: number
  valueUnit?: 'cm' | 'in' | null
  isActive?: boolean
  measurements?: SizeMeasurementInput[]
}

export type UpdateSizePayload = Partial<CreateSizePayload>
