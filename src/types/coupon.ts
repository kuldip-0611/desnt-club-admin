export type CouponDiscountType = 'PERCENT' | 'FIXED'

export interface Coupon {
  id: string
  code: string
  discountType: CouponDiscountType
  value: string
  minSubtotal: string | null
  maxDiscount: string | null
  usageLimit: number | null
  usedCount: number
  startsAt: string | null
  endsAt: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type CreateCouponPayload = {
  code: string
  discountType: CouponDiscountType
  value: number
  minSubtotal?: number
  maxDiscount?: number
  usageLimit?: number
  startsAt?: string
  endsAt?: string
  isActive?: boolean
}

export type UpdateCouponPayload = {
  code?: string
  discountType?: CouponDiscountType
  value?: number
  minSubtotal?: number | null
  maxDiscount?: number | null
  usageLimit?: number | null
  startsAt?: string | null
  endsAt?: string | null
  isActive?: boolean
}
