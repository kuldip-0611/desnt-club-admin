import type { ReactElement } from 'react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Gift, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { listGiftCards, type GiftCard } from '../services/giftCards'

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

function StatusBadge({ card }: { card: GiftCard }) {
  const isExpired = card.expiresAt ? new Date(card.expiresAt) < new Date() : false
  if (!card.isActive || isExpired) {
    return <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">Expired / Inactive</span>
  }
  if (card.balance <= 0) {
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">Used Up</span>
  }
  return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Active</span>
}

const GiftCards = (): ReactElement => {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin-gift-cards', page],
    queryFn: () => listGiftCards(page, 20),
  })

  const filtered = (data?.items ?? []).filter(
    (c) =>
      !search ||
      c.code.includes(search.toUpperCase()) ||
      c.recipientEmail.toLowerCase().includes(search.toLowerCase()) ||
      (c.recipientName ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  const usedValue  = (data?.items ?? []).reduce((s, c) => s + (c.initialAmount - c.balance), 0)
  const active     = (data?.items ?? []).filter((c) => c.isActive && c.balance > 0 && (!c.expiresAt || new Date(c.expiresAt) > new Date())).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gift Cards</h1>
          <p className="mt-0.5 text-sm text-slate-500">All gift cards issued on the platform</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total Issued', value: data ? `${data.total} cards` : '—' },
          { label: 'Active Cards', value: isLoading ? '—' : `${active}` },
          { label: 'Value Redeemed', value: isLoading ? '—' : fmt(usedValue) },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search code or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Code</th>
              <th className="px-4 py-3 text-left">Recipient</th>
              <th className="px-4 py-3 text-right">Initial</th>
              <th className="px-4 py-3 text-right">Balance</th>
              <th className="px-4 py-3 text-left">Expires</th>
              <th className="px-4 py-3 text-left">Purchased By</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-sm text-slate-400">Loading…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <Gift className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-400">No gift cards found</p>
                </td>
              </tr>
            ) : (
              filtered.map((card) => (
                <tr key={card.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono font-semibold tracking-wider text-indigo-700">{card.code}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{card.recipientName ?? '—'}</p>
                    <p className="text-xs text-slate-500">{card.recipientEmail}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(card.initialAmount)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${card.balance > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {fmt(card.balance)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{fmtDate(card.expiresAt)}</td>
                  <td className="px-4 py-3">
                    {card.purchasedBy ? (
                      <div>
                        <p className="text-xs font-medium text-slate-700">{card.purchasedBy.name}</p>
                        <p className="text-xs text-slate-400">{card.purchasedBy.email}</p>
                      </div>
                    ) : <span className="text-xs text-slate-400">Guest</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge card={card} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Page {data.page} of {data.totalPages} · {data.total} total</p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-300 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default GiftCards
