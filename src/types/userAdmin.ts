import type { CouponDiscountType } from './coupon'
import type { User } from './user'

export type UserGroupRef = {
  id: string
  name: string
  isActive: boolean
}

export type AssignedCouponRef = {
  id: string
  code: string
  discountType: CouponDiscountType
  value: string
  isActive: boolean
  endsAt: string | null
}

export type UserAvailableCoupon = {
  id: string
  code: string
  discountType: CouponDiscountType
  value: string
  minSubtotal: string | null
  maxDiscount: string | null
  usageLimit: number | null
  perUserLimit: number | null
  usedCount: number
  startsAt: string | null
  endsAt: string | null
  isActive: boolean
  categoryLinks: {
    categoryId: string
    category: { id: string; name: string; slug: string }
  }[]
  restricted: boolean
  eligible: boolean
  source: 'public' | 'direct' | 'group'
  assignedGroups: { id: string; name: string }[]
  status: string
}

export type UserAdminDetail = {
  user: User
  groups: UserGroupRef[]
  assignedCoupons: AssignedCouponRef[]
  availableCoupons: UserAvailableCoupon[]
}

export type CouponValidationResult = {
  valid: boolean
  message?: string
  couponId?: string
  code?: string
  discountAmount: string
  subtotal: string
  subtotalAfterDiscount: string
}
