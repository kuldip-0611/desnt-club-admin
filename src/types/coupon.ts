export type CouponDiscountType = 'PERCENT' | 'FIXED'

export interface Coupon {
  id: string
  code: string
  discountType: CouponDiscountType
  value: string
  minSubtotal: string | null
  maxDiscount: string | null
  usageLimit: number | null
  perUserLimit?: number | null
  usedCount: number
  startsAt: string | null
  endsAt: string | null
  isActive: boolean
  categoryLinks: { categoryId: string; category: { id: string; name: string; slug: string } }[]
  userLinks?: {
    id: string
    userId: string
    user: { id: string; name: string; email: string | null }
  }[]
  userGroupLinks?: {
    id: string
    userGroupId: string
    userGroup: { id: string; name: string }
  }[]
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
  categoryIds?: string[]
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
  categoryIds?: string[]
}
