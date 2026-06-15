import type { ReactElement } from 'react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import api from '../services/api'
import { adjustUserLoyalty } from '../services/users'

interface LoyaltyListItem {
  id: string
  userId: string
  balance: number
  totalEarned: number
  totalRedeemed: number
  user: { id: string; name: string; email: string | null; phone: string | null }
}

interface LoyaltyListResponse {
  items: LoyaltyListItem[]
  total: number
  page: number
  totalPages: number
}

const fetchLoyaltyAccounts = async (page: number): Promise<LoyaltyListResponse> => {
  const { data } = await api.get<LoyaltyListResponse>('/admin/loyalty', { params: { page, limit: 20 } })
  return data
}

const Loyalty = (): ReactElement => {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [adjustingUser, setAdjustingUser] = useState<LoyaltyListItem | null>(null)
  const [adjustPoints, setAdjustPoints] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustNote, setAdjustNote] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-loyalty-list', page],
    queryFn: () => fetchLoyaltyAccounts(page),
  })

  const adjustMutation = useMutation({
    mutationFn: () =>
      adjustUserLoyalty(adjustingUser!.userId, {
        points: Number(adjustPoints),
        reason: adjustReason.trim(),
        adminNote: adjustNote.trim() || undefined,
      }),
    onSuccess: (result) => {
      toast.success(
        `Adjusted for ${adjustingUser?.user.name}: ${result.previousBalance} → ${result.newBalance}`,
      )
      setAdjustingUser(null)
      setAdjustPoints('')
      setAdjustReason('')
      setAdjustNote('')
      queryClient.invalidateQueries({ queryKey: ['admin-loyalty-list'] })
    },
    onError: (err: Error) => toast.error(err.message ?? 'Adjustment failed'),
  })

  const items = data?.items ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Loyalty Points
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          View all user loyalty accounts. Adjust points and see transaction history in each user card.
        </p>
      </div>

      {/* Stats bar */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{data.total}</p>
            <p className="mt-0.5 text-xs text-slate-500">Total accounts</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
            <p className="text-2xl font-bold text-green-700">
              {items.reduce((s, i) => s + i.totalEarned, 0).toLocaleString()}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Points earned (this page)</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
            <p className="text-2xl font-bold text-indigo-700">
              {items.reduce((s, i) => s + i.balance, 0).toLocaleString()}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Points outstanding (this page)</p>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading loyalty accounts…
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          Could not load loyalty data. Check backend is running.
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No loyalty accounts yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 text-right">Earned</th>
                <th className="px-4 py-3 text-right">Redeemed</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{item.user.name}</p>
                    <p className="text-xs text-slate-500">{item.user.email ?? item.user.phone ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-slate-900">{item.balance.toLocaleString()}</span>
                    <span className="ml-1 text-xs text-slate-500">pts</span>
                  </td>
                  <td className="px-4 py-3 text-right text-green-700 font-semibold">
                    +{item.totalEarned.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-red-600 font-semibold">
                    -{item.totalRedeemed.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setAdjustingUser(item)
                        setAdjustPoints('')
                        setAdjustReason('')
                        setAdjustNote('')
                      }}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                    >
                      Adjust
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
            <span className="text-slate-600">
              Page {data?.page ?? 1} of {data?.totalPages ?? 1} · {data?.total ?? 0} accounts
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= (data?.totalPages ?? 1)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust modal */}
      {adjustingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Adjust Points</h2>
                <p className="text-sm text-slate-500">{adjustingUser.user.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setAdjustingUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-center">
              <p className="text-3xl font-bold text-slate-900">{adjustingUser.balance.toLocaleString()}</p>
              <p className="text-xs text-slate-500">Current balance</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Points to add / deduct
                </label>
                <input
                  type="number"
                  value={adjustPoints}
                  onChange={(e) => setAdjustPoints(e.target.value)}
                  placeholder="e.g. 100 (add) or -50 (deduct)"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Reason <span className="text-red-500">*</span>
                </label>
                <input
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Min 5 characters"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Admin note (optional)
                </label>
                <input
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="Internal note"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none"
                />
              </div>
            </div>

            {adjustPoints && Number(adjustPoints) !== 0 && adjustReason.trim().length >= 5 && (
              <div className="rounded-xl bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
                New balance will be:{' '}
                <strong>
                  {Math.max(0, adjustingUser.balance + Number(adjustPoints)).toLocaleString()} pts
                </strong>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAdjustingUser(null)}
                className="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  !adjustPoints ||
                  Number(adjustPoints) === 0 ||
                  adjustReason.trim().length < 5 ||
                  adjustMutation.isPending
                }
                onClick={() => adjustMutation.mutate()}
                className="flex-1 rounded-xl bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
              >
                {adjustMutation.isPending ? 'Saving…' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Loyalty
