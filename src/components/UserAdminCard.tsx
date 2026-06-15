import type { ReactElement } from 'react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { listCoupons } from '../services/coupons'
import {
  assignCouponToUser,
  getUserAdminDetail,
  getUserLoyalty,
  adjustUserLoyalty,
  unassignCouponFromUser,
  updateUserByAdmin,
  validateCouponForUser,
} from '../services/users'
import type { User } from '../types/user'

type UserAdminCardProps = {
  user: User
}

const formatDiscount = (type: string, value: string): string => {
  const n = Number(value)
  if (type === 'PERCENT') return `${n}% off`
  return `₹${n.toFixed(2)} off`
}

const TX_TYPE_COLOR: Record<string, string> = {
  EARNED: 'text-green-600',
  REDEEMED: 'text-red-500',
  EXPIRED: 'text-slate-400',
  BONUS: 'text-blue-600',
  REFERRAL: 'text-purple-600',
  ADJUSTED: 'text-orange-500',
}

const UserAdminCard = ({ user }: UserAdminCardProps): ReactElement => {
  const queryClient = useQueryClient()
  const [assignCouponId, setAssignCouponId] = useState('')
  const [validateCode, setValidateCode] = useState('')
  const [validateSubtotal, setValidateSubtotal] = useState('500')
  const [validationResult, setValidationResult] = useState<string | null>(null)

  // Loyalty state
  const [showLoyalty, setShowLoyalty] = useState(false)
  const [adjustPoints, setAdjustPoints] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustNote, setAdjustNote] = useState('')

  const {
    data: detail,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-user-detail', user.id],
    queryFn: () => getUserAdminDetail(user.id),
    retry: 1,
  })

  const { data: allCoupons = [] } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: listCoupons,
  })

  const invalidate = (): void => {
    queryClient.invalidateQueries({ queryKey: ['admin-user-detail', user.id] })
    queryClient.invalidateQueries({ queryKey: ['admin-users'] })
  }

  const updateMutation = useMutation({
    mutationFn: (payload: { role?: 'USER' | 'ADMIN'; isVerified?: boolean }) =>
      updateUserByAdmin(user.id, payload),
    onSuccess: () => {
      invalidate()
      toast.success('User updated')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Update failed'),
  })

  const assignMutation = useMutation({
    mutationFn: (couponId: string) => assignCouponToUser(user.id, couponId),
    onSuccess: () => {
      setAssignCouponId('')
      invalidate()
      toast.success('Coupon assigned to user')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Assign failed'),
  })

  const unassignMutation = useMutation({
    mutationFn: (couponId: string) => unassignCouponFromUser(user.id, couponId),
    onSuccess: () => {
      invalidate()
      toast.success('Coupon removed')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Remove failed'),
  })

  const validateMutation = useMutation({
    mutationFn: () =>
      validateCouponForUser(user.id, {
        code: validateCode.trim(),
        subtotal: Number(validateSubtotal) || 0,
      }),
    onSuccess: (result) => {
      if (result.valid) {
        setValidationResult(
          `Valid — ${result.code}: saves ₹${result.discountAmount} (total ₹${result.subtotalAfterDiscount})`,
        )
      } else {
        setValidationResult(result.message ?? 'Invalid coupon')
      }
    },
    onError: (err: Error) => setValidationResult(err.message ?? 'Validation failed'),
  })

  const { data: loyaltyData, refetch: refetchLoyalty } = useQuery({
    queryKey: ['admin-loyalty', user.id],
    queryFn: () => getUserLoyalty(user.id),
    enabled: showLoyalty,
  })

  const adjustMutation = useMutation({
    mutationFn: () =>
      adjustUserLoyalty(user.id, {
        points: Number(adjustPoints),
        reason: adjustReason.trim(),
        adminNote: adjustNote.trim() || undefined,
      }),
    onSuccess: (result) => {
      toast.success(
        `Points adjusted: ${result.previousBalance} → ${result.newBalance} (${result.adjustedBy > 0 ? '+' : ''}${result.adjustedBy})`,
      )
      setAdjustPoints('')
      setAdjustReason('')
      setAdjustNote('')
      void refetchLoyalty()
    },
    onError: (err: Error) => toast.error(err.message ?? 'Adjust failed'),
  })

  const available = detail?.availableCoupons ?? []
  const groups = detail?.groups ?? []
  const directAssigned = detail?.assignedCoupons ?? []
  const unassignedCoupons = allCoupons.filter(
    (c) => c.isActive && !directAssigned.some((a) => a.id === c.id),
  )

  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{user.name}</h3>
            <p className="text-sm text-slate-600">{user.email ?? 'No email'}</p>
            <p className="text-xs text-slate-500">{user.phone ?? 'No phone'} · {user.provider}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={user.role}
              disabled={updateMutation.isPending}
              onChange={(e) =>
                updateMutation.mutate({ role: e.target.value as 'USER' | 'ADMIN' })
              }
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold"
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <button
              type="button"
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate({ isVerified: !user.isVerified })}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                user.isVerified
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {user.isVerified ? 'Verified' : 'Unverified'}
            </button>
          </div>
        </div>
        {groups.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {groups.map((g) => (
              <span
                key={g.id}
                className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-800"
              >
                {g.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-slate-500">No groups — assign from User groups page</p>
        )}
      </div>

      <div className="flex-1 p-4">
        <h4 className="text-sm font-semibold text-slate-900">Available coupons</h4>
        <p className="mt-0.5 text-xs text-slate-500">
          Public coupons and those assigned to this user or their groups
        </p>

        {isError ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            <p className="font-semibold">Could not load coupon data</p>
            <p className="mt-1 text-xs">
              {(error as Error)?.message ??
                'Restart the backend (yarn start:dev) so user-group APIs are available.'}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-2 text-xs font-semibold text-indigo-700 underline"
            >
              Retry
            </button>
          </div>
        ) : isLoading ? (
          <p className="mt-3 text-sm text-slate-500">Loading coupons…</p>
        ) : available.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-sm text-slate-500">
            No coupons available for this user
          </p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {available.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-slate-900">{c.code}</span>
                  <span className="text-xs font-semibold text-emerald-800">
                    {formatDiscount(c.discountType, c.value)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {c.source === 'public' && 'Everyone'}
                  {c.source === 'direct' && 'Assigned to user'}
                  {c.source === 'group' &&
                    `Via group${c.assignedGroups.length ? `: ${c.assignedGroups.map((g) => g.name).join(', ')}` : ''}`}
                </p>
              </li>
            ))}
          </ul>
        )}

        {directAssigned.length > 0 ? (
          <div className="mt-4">
            <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Direct assignments
            </h5>
            <ul className="mt-2 space-y-1">
              {directAssigned.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                >
                  <span className="font-mono text-sm font-semibold">{c.code}</span>
                  <button
                    type="button"
                    onClick={() => unassignMutation.mutate(c.id)}
                    disabled={unassignMutation.isPending}
                    className="text-xs font-semibold text-red-600 hover:text-red-500"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
          <h5 className="text-xs font-semibold text-slate-800">Assign coupon to user</h5>
          <div className="mt-2 flex flex-wrap gap-2">
            <select
              value={assignCouponId}
              onChange={(e) => setAssignCouponId(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Select coupon…</option>
              {unassignedCoupons.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} ({formatDiscount(c.discountType, c.value)})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!assignCouponId || assignMutation.isPending}
              onClick={() => assignMutation.mutate(assignCouponId)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Assign
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
          <h5 className="text-xs font-semibold text-indigo-900">Validate coupon for this user</h5>
          <div className="mt-2 flex flex-wrap gap-2">
            <input
              value={validateCode}
              onChange={(e) => setValidateCode(e.target.value.toUpperCase())}
              placeholder="COUPON CODE"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm uppercase"
            />
            <input
              type="number"
              min={0}
              value={validateSubtotal}
              onChange={(e) => setValidateSubtotal(e.target.value)}
              placeholder="Subtotal"
              className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={!validateCode.trim() || validateMutation.isPending}
              onClick={() => validateMutation.mutate()}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              Validate
            </button>
          </div>
          {validationResult ? (
            <p
              className={`mt-2 text-sm ${
                validationResult.startsWith('Valid') ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {validationResult}
            </p>
          ) : null}
        </div>
      </div>

      {/* ── Loyalty Points Panel ── */}
      <div className="border-t border-slate-100">
        <button
          type="button"
          onClick={() => setShowLoyalty((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          <span>🏆 Loyalty Points{loyaltyData ? ` — ${loyaltyData.balance.toLocaleString()} pts` : ''}</span>
          <span className="text-slate-400">{showLoyalty ? '▲' : '▼'}</span>
        </button>

        {showLoyalty && (
          <div className="px-4 pb-4 space-y-4">
            {/* Balance summary */}
            {loyaltyData ? (
              <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center text-xs">
                <div>
                  <p className="text-lg font-bold text-slate-900">{loyaltyData.balance.toLocaleString()}</p>
                  <p className="text-slate-500">Balance</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-green-700">{loyaltyData.totalEarned.toLocaleString()}</p>
                  <p className="text-slate-500">Earned</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-600">{loyaltyData.totalRedeemed.toLocaleString()}</p>
                  <p className="text-slate-500">Redeemed</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Loading loyalty data…</p>
            )}

            {/* Adjust points */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-900">Adjust points</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={adjustPoints}
                  onChange={(e) => setAdjustPoints(e.target.value)}
                  placeholder="e.g. 100 or -50"
                  className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
                <input
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Reason (min 5 chars)"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <input
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="Admin note (optional)"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={
                  !adjustPoints ||
                  Number(adjustPoints) === 0 ||
                  adjustReason.trim().length < 5 ||
                  adjustMutation.isPending
                }
                onClick={() => adjustMutation.mutate()}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {adjustMutation.isPending ? 'Saving…' : 'Apply adjustment'}
              </button>
            </div>

            {/* Transaction history */}
            {loyaltyData && loyaltyData.transactions.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Recent transactions
                </p>
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {loyaltyData.transactions.slice(0, 10).map((tx) => (
                    <li key={tx.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-xs">
                      <div>
                        <p className="font-medium text-slate-800">{tx.description}</p>
                        <p className="text-slate-400">
                          {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric',
                          })}
                        </p>
                      </div>
                      <span className={`font-bold ${TX_TYPE_COLOR[tx.type] ?? 'text-slate-700'}`}>
                        {tx.points > 0 ? '+' : ''}{tx.points} pts
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </article>
  )
}

export default UserAdminCard
