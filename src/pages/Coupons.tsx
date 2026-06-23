import type { ReactElement } from 'react'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import DataTable, { type DataTableColumn } from '../components/ui/DataTable'
import FilterBar from '../components/ui/FilterBar'
import KpiCard from '../components/ui/KpiCard'
import { deleteCoupon, listCoupons, updateCoupon } from '../services/coupons'
import type { Coupon } from '../types/coupon'

const formatMoney = (s: string | null): string => {
  if (s == null || s === '') return '—'
  const n = Number(s)
  if (Number.isNaN(n)) return s
  return n.toFixed(2)
}

const formatDate = (iso: string | null): string => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

const Coupons = (): ReactElement => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null)

  const { data: coupons, isLoading, isError } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: listCoupons,
  })

  const stats = useMemo(() => {
    const list = coupons ?? []
    return {
      total: list.length,
      active: list.filter((c) => c.isActive).length,
    }
  }, [coupons])

  const filtered = useMemo(() => {
    if (!coupons?.length) return []
    const q = search.trim().toLowerCase()
    if (!q) return coupons
    return coupons.filter((c) => c.code.toLowerCase().includes(q))
  }, [coupons, search])

  const deleteMutation = useMutation({
    mutationFn: deleteCoupon,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
      toast.success('Coupon deleted')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Delete failed'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateCoupon(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
      toast.success('Coupon updated')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Update failed'),
  })

  const handleDelete = (c: Coupon) => {
    setCouponToDelete(c)
  }

  const handleToggle = (c: Coupon) => {
    toggleMutation.mutate({ id: c.id, isActive: !c.isActive })
  }

  const columns: DataTableColumn<Coupon>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (c) => <span className="font-mono font-semibold text-slate-900">{c.code}</span>,
    },
    {
      key: 'discount',
      header: 'Discount',
      render: (c) => (
        <span className="text-slate-700">
          {c.discountType === 'PERCENT' ? `${formatMoney(c.value)}%` : `₹${formatMoney(c.value)}`}
          {c.discountType === 'PERCENT' && c.maxDiscount ? (
            <span className="ml-1 text-xs text-slate-500">(max ₹{formatMoney(c.maxDiscount)})</span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'uses',
      header: 'Uses',
      render: (c) => (
        <span className="tabular-nums text-slate-700">
          {c.usedCount}
          {c.usageLimit != null ? ` / ${c.usageLimit}` : ' / ∞'}
        </span>
      ),
    },
    {
      key: 'ends',
      header: 'Ends',
      render: (c) => <span className="text-slate-600">{formatDate(c.endsAt)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => {
        const now = new Date()
        const expired = c.endsAt ? new Date(c.endsAt) < now : false
        const limitReached = c.usageLimit != null && c.usedCount >= c.usageLimit
        const label = !c.isActive
          ? 'Inactive'
          : expired
            ? 'Expired'
            : limitReached
              ? 'Limit reached'
              : 'Active'
        const cls = !c.isActive || expired || limitReached
          ? 'bg-red-100 text-red-700'
          : 'bg-emerald-100 text-emerald-800'
        return (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>
            {label}
          </span>
        )
      },
    },
    {
      key: 'active',
      header: 'Toggle',
      render: (c) => (
        <button
          type="button"
          onClick={() => handleToggle(c)}
          disabled={toggleMutation.isPending}
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            c.isActive ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          {c.isActive ? 'On' : 'Off'}
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (c) => (
        <>
          <Link
            to={`/dashboard/coupons/${c.id}/edit`}
            className="mr-2 inline-flex text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={() => handleDelete(c)}
            className="text-sm font-semibold text-red-600 hover:text-red-500"
          >
            Delete
          </button>
        </>
      ),
    },
  ]

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-medium">Loading coupons…</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-800">
        Could not load coupons. Check that the API is running and you are logged in as admin.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Coupons</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create discount codes. Shoppers validate against cart subtotal via the public API (
            <code className="rounded bg-slate-100 px-1 text-xs">POST /coupons/validate</code>
            ).
          </p>
        </div>
        <Link
          to="/dashboard/coupons/new"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-900/20 transition hover:bg-indigo-500"
        >
          + New coupon
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard label="Total codes" value={stats.total} />
        <KpiCard label="Active" value={stats.active} tone="success" />
      </div>

      <FilterBar
        searchId="coupon-search"
        searchPlaceholder="Search by code…"
        searchValue={search}
        onSearchChange={setSearch}
      />

      {filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white px-8 py-16 text-center">
          <p className="text-sm font-medium text-slate-600">No coupons match your search.</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(row) => row.id}
          emptyText={search ? `No coupons match "${search}".` : 'No coupons found.'}
        />
      )}
      <ConfirmDeleteModal
        isOpen={couponToDelete != null}
        title="Delete coupon"
        message={
          couponToDelete
            ? `Delete coupon "${couponToDelete.code}"? This action cannot be undone.`
            : ''
        }
        isLoading={deleteMutation.isPending}
        onClose={() => setCouponToDelete(null)}
        onConfirm={() => {
          if (!couponToDelete) return
          deleteMutation.mutate(couponToDelete.id, {
            onSuccess: () => setCouponToDelete(null),
          })
        }}
      />
    </div>
  )
}

export default Coupons
