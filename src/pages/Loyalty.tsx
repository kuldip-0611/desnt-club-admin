import type { ReactElement } from 'react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { Settings, Users } from 'lucide-react'
import api from '../services/api'
import { adjustUserLoyalty, getLoyaltySettings, updateLoyaltySettings } from '../services/users'
import type { LoyaltySettings } from '../services/users'
import ListLoader from '../components/ui/ListLoader'

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

// ── Settings Panel ────────────────────────────────────────────────────────────

function SettingsPanel(): ReactElement {
  const queryClient = useQueryClient()
  const { data: settings, isLoading } = useQuery({
    queryKey: ['loyalty-settings'],
    queryFn: getLoyaltySettings,
  })

  const [form, setForm] = useState<Partial<LoyaltySettings>>({})
  const isDirty = Object.keys(form).length > 0

  const saveMutation = useMutation({
    mutationFn: () => updateLoyaltySettings(form),
    onSuccess: (updated) => {
      toast.success('Loyalty settings saved!')
      setForm({})
      queryClient.setQueryData(['loyalty-settings'], updated)
    },
    onError: () => toast.error('Failed to save settings'),
  })

  const val = (key: keyof LoyaltySettings): number =>
    (form[key] ?? settings?.[key] ?? 0) as number

  const set = (key: keyof LoyaltySettings, v: number) =>
    setForm((prev) => ({ ...prev, [key]: v }))

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Loading settings…
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div>
          <h2 className="font-bold text-slate-900">Program Settings</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Changes apply to all future orders. Existing earned points are not affected.
          </p>
        </div>
        <button
          type="button"
          disabled={!isDirty || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 transition"
        >
          {saveMutation.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      <div className="grid gap-0 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
        {/* Earning */}
        <div className="space-y-4 p-6">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Earning</p>

          <SettingField
            label="Points per ₹1 spent"
            hint="How many points a customer earns for every ₹1 of order value"
            value={val('pointsPerRupee')}
            onChange={(v) => set('pointsPerRupee', v)}
            step={0.1}
            min={0}
            suffix="pts / ₹1"
          />

          <SettingField
            label="Earn multiplier"
            hint="Multiply earned points (e.g. 2× during sales events)"
            value={val('orderEarnMultiplier')}
            onChange={(v) => set('orderEarnMultiplier', v)}
            step={0.5}
            min={0}
            suffix="×"
          />

          <SettingField
            label="Referral bonus (referrer)"
            hint="Points given to the referrer when their friend places first order"
            value={val('referralBonus')}
            onChange={(v) => set('referralBonus', v)}
            step={10}
            min={0}
            suffix="pts"
            integer
          />

          <SettingField
            label="Referral bonus (new user)"
            hint="Points given to the new user who signed up via referral"
            value={val('referredBonus')}
            onChange={(v) => set('referredBonus', v)}
            step={10}
            min={0}
            suffix="pts"
            integer
          />
        </div>

        {/* Redemption */}
        <div className="space-y-4 p-6">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Redemption</p>

          <SettingField
            label="Rupee value per point"
            hint="How much ₹ discount 1 point gives when redeeming (e.g. 0.25 means 100 pts = ₹25 off)"
            value={val('rupeePerPoint')}
            onChange={(v) => set('rupeePerPoint', v)}
            step={0.05}
            min={0}
            suffix="₹ / pt"
          />

          <SettingField
            label="Minimum points to redeem"
            hint="User must have at least this many points before they can apply them at checkout"
            value={val('minRedeemPoints')}
            onChange={(v) => set('minRedeemPoints', v)}
            step={10}
            min={1}
            suffix="pts"
            integer
          />

          <SettingField
            label="Max redemption (% of order)"
            hint="Points discount cannot exceed this % of the order total (e.g. 20 = max 20% off via points)"
            value={val('maxRedeemPercent')}
            onChange={(v) => set('maxRedeemPercent', v)}
            step={5}
            min={1}
            max={100}
            suffix="%"
            integer
          />

          {/* Live preview */}
          <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-700">Preview (₹1,000 order)</p>
            <p>Earn: <strong>{Math.floor(1000 * val('pointsPerRupee') * val('orderEarnMultiplier'))} pts</strong></p>
            <p>
              If redeeming {val('minRedeemPoints')} pts: <strong>₹{(val('minRedeemPoints') * val('rupeePerPoint')).toFixed(2)} off</strong>
            </p>
            <p>
              Max discount on ₹1,000 order: <strong>₹{(1000 * val('maxRedeemPercent') / 100).toFixed(0)}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingField({
  label, hint, value, onChange, step = 1, min = 0, max, suffix, integer,
}: {
  label: string
  hint: string
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  suffix?: string
  integer?: boolean
}): ReactElement {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-slate-800">{label}</label>
      <p className="mb-1.5 text-xs text-slate-500">{hint}</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            const v = integer ? parseInt(e.target.value) : parseFloat(e.target.value)
            if (!isNaN(v)) onChange(v)
          }}
          className="w-28 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-900 focus:border-indigo-400 focus:outline-none"
        />
        {suffix && <span className="text-sm text-slate-500">{suffix}</span>}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const Loyalty = (): ReactElement => {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState<'accounts' | 'settings'>('accounts')
  const [adjustingUser, setAdjustingUser] = useState<LoyaltyListItem | null>(null)
  const [adjustPoints, setAdjustPoints] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustNote, setAdjustNote] = useState('')

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['admin-loyalty-list', page],
    queryFn: () => fetchLoyaltyAccounts(page),
    enabled: tab === 'accounts',
    placeholderData: keepPreviousData,
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
  const isInitialLoading = isLoading && items.length === 0
  const isRefreshing = isFetching && items.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Loyalty Program
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Configure earn/redeem rules and manage user accounts.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab('accounts')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === 'accounts'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="h-4 w-4" />
          User Accounts
        </button>
        <button
          type="button"
          onClick={() => setTab('settings')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            tab === 'settings'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Settings className="h-4 w-4" />
          Program Settings
        </button>
      </div>

      {/* Settings tab */}
      {tab === 'settings' && <SettingsPanel />}

      {/* Accounts tab */}
      {tab === 'accounts' && (
        <>
          {/* Stats */}
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

          {isInitialLoading ? (
            <ListLoader label="Loading loyalty accounts…" />
          ) : isError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
              Could not load loyalty data. Check backend is running.
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No loyalty accounts yet.
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {isRefreshing ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
                  <span className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                </div>
              ) : null}
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
        </>
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
              <button type="button" onClick={() => setAdjustingUser(null)} className="text-slate-400 hover:text-slate-600">✕</button>
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
                <label className="mb-1 block text-xs font-semibold text-slate-700">Admin note (optional)</label>
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
                <strong>{Math.max(0, adjustingUser.balance + Number(adjustPoints)).toLocaleString()} pts</strong>
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
                disabled={!adjustPoints || Number(adjustPoints) === 0 || adjustReason.trim().length < 5 || adjustMutation.isPending}
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
