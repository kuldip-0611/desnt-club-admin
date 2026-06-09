import type { ReactElement } from 'react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import {
  assignCouponToGroup,
  assignCouponToUser,
  getCoupon,
  unassignCouponFromGroup,
  unassignCouponFromUser,
} from '../services/coupons'
import { listUserGroups } from '../services/userGroups'
import { listUsers } from '../services/users'

type CouponAudiencePanelProps = {
  couponId: string
}

const CouponAudiencePanel = ({ couponId }: CouponAudiencePanelProps): ReactElement => {
  const queryClient = useQueryClient()
  const [userId, setUserId] = useState('')
  const [groupId, setGroupId] = useState('')

  const { data: coupon, isLoading } = useQuery({
    queryKey: ['admin-coupon', couponId],
    queryFn: () => getCoupon(couponId),
  })

  const { data: usersData } = useQuery({
    queryKey: ['admin-users-picker'],
    queryFn: () => listUsers({ limit: 100 }),
  })

  const { data: groups = [] } = useQuery({
    queryKey: ['admin-user-groups'],
    queryFn: listUserGroups,
  })

  const invalidate = (): void => {
    queryClient.invalidateQueries({ queryKey: ['admin-coupon', couponId] })
    queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
    queryClient.invalidateQueries({ queryKey: ['admin-users'] })
  }

  const assignUserMutation = useMutation({
    mutationFn: () => assignCouponToUser(couponId, userId),
    onSuccess: () => {
      setUserId('')
      invalidate()
      toast.success('User added to coupon audience')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed'),
  })

  const assignGroupMutation = useMutation({
    mutationFn: () => assignCouponToGroup(couponId, groupId),
    onSuccess: () => {
      setGroupId('')
      invalidate()
      toast.success('Group added to coupon audience')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Failed'),
  })

  const unassignUserMutation = useMutation({
    mutationFn: (uid: string) => unassignCouponFromUser(couponId, uid),
    onSuccess: invalidate,
    onError: (err: Error) => toast.error(err.message ?? 'Failed'),
  })

  const unassignGroupMutation = useMutation({
    mutationFn: (gid: string) => unassignCouponFromGroup(couponId, gid),
    onSuccess: invalidate,
    onError: (err: Error) => toast.error(err.message ?? 'Failed'),
  })

  if (isLoading || !coupon) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Loading audience…
      </section>
    )
  }

  const userLinks = coupon.userLinks ?? []
  const groupLinks = coupon.userGroupLinks ?? []
  const isRestricted = userLinks.length > 0 || groupLinks.length > 0
  const users = usersData?.items ?? []

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Who can use this coupon</h2>
      <p className="mt-1 text-sm text-slate-600">
        {isRestricted
          ? 'Only listed users and group members can use this code.'
          : 'No restrictions — any customer can use this code (public coupon).'}
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <h3 className="text-sm font-semibold text-slate-800">Allowed users</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Add user…</option>
              {users
                .filter((u) => !userLinks.some((l) => l.userId === u.id))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email ?? u.phone ?? '—'})
                  </option>
                ))}
            </select>
            <button
              type="button"
              disabled={!userId || assignUserMutation.isPending}
              onClick={() => assignUserMutation.mutate()}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <ul className="mt-3 space-y-1">
            {userLinks.length === 0 ? (
              <li className="text-xs text-slate-500">None</li>
            ) : (
              userLinks.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <span>
                    {l.user.name}
                    <span className="ml-2 text-xs text-slate-500">{l.user.email}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => unassignUserMutation.mutate(l.userId)}
                    className="text-xs font-semibold text-red-600"
                  >
                    Remove
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
          <h3 className="text-sm font-semibold text-slate-800">Allowed groups</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Add group…</option>
              {groups
                .filter((g) => !groupLinks.some((l) => l.userGroupId === g.id))
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g._count.members} members)
                  </option>
                ))}
            </select>
            <button
              type="button"
              disabled={!groupId || assignGroupMutation.isPending}
              onClick={() => assignGroupMutation.mutate()}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Add
            </button>
          </div>
          <ul className="mt-3 space-y-1">
            {groupLinks.length === 0 ? (
              <li className="text-xs text-slate-500">None</li>
            ) : (
              groupLinks.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <span>{l.userGroup.name}</span>
                  <button
                    type="button"
                    onClick={() => unassignGroupMutation.mutate(l.userGroupId)}
                    className="text-xs font-semibold text-red-600"
                  >
                    Remove
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </section>
  )
}

export default CouponAudiencePanel
