export type UserGroupSummary = {
  id: string
  name: string
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: { members: number; couponLinks: number }
}

export type UserGroupMember = {
  id: string
  userGroupId: string
  userId: string
  createdAt: string
  user: {
    id: string
    name: string
    email: string | null
    phone: string | null
    role: string
    isVerified: boolean
  }
}

export type UserGroupDetail = UserGroupSummary & {
  members: UserGroupMember[]
  couponLinks: {
    id: string
    couponId: string
    coupon: { id: string; code: string; isActive: boolean }
  }[]
}

export type CreateUserGroupPayload = {
  name: string
  description?: string
  isActive?: boolean
}

export type UpdateUserGroupPayload = {
  name?: string
  description?: string | null
  isActive?: boolean
}
