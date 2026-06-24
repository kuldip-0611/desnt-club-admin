import type { ReactElement } from 'react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { Package, ShoppingCart, Clock, CheckCircle2, Truck, XCircle, RotateCcw } from 'lucide-react'
import ListLoader from '../components/ui/ListLoader'
import DataTable, { type DataTableColumn } from '../components/ui/DataTable'
import FilterBar from '../components/ui/FilterBar'
import { useDebounce } from '../hooks/useDebounce'
import { listOrders, markCodRemitted, updateOrderStatus, type Order } from '../services/orders'

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'] as const

type OrderStatus = (typeof ORDER_STATUSES)[number]

const statusConfig: Record<OrderStatus, { label: string; icon: ReactElement; classes: string }> = {
  PENDING:    { label: 'Pending',    icon: <Clock size={12} />,         classes: 'bg-amber-500/10 text-amber-400 ring-amber-500/20' },
  CONFIRMED:  { label: 'Confirmed',  icon: <CheckCircle2 size={12} />,  classes: 'bg-blue-500/10 text-blue-400 ring-blue-500/20' },
  PROCESSING: { label: 'Processing', icon: <Package size={12} />,       classes: 'bg-violet-500/10 text-violet-400 ring-violet-500/20' },
  SHIPPED:    { label: 'Shipped',    icon: <Truck size={12} />,         classes: 'bg-cyan-500/10 text-cyan-400 ring-cyan-500/20' },
  DELIVERED:  { label: 'Delivered',  icon: <CheckCircle2 size={12} />,  classes: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' },
  CANCELLED:  { label: 'Cancelled',  icon: <XCircle size={12} />,       classes: 'bg-red-500/10 text-red-400 ring-red-500/20' },
  REFUNDED:   { label: 'Refunded',   icon: <RotateCcw size={12} />,     classes: 'bg-slate-500/10 text-slate-400 ring-slate-500/20' },
}

const paymentStatusClasses: Record<string, string> = {
  PAID:    'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  PENDING: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  FAILED:  'bg-red-500/10 text-red-400 ring-red-500/20',
  REFUNDED:'bg-slate-500/10 text-slate-400 ring-slate-500/20',
}

const returnStatusClasses: Record<string, string> = {
  REQUESTED: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  APPROVED: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
  REJECTED: 'bg-red-500/10 text-red-400 ring-red-500/20',
  RECEIVED: 'bg-violet-500/10 text-violet-400 ring-violet-500/20',
  REFUNDED: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
}

const Orders = (): ReactElement => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search.trim(), 350)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'ALL' | OrderStatus>('ALL')
  const pageSize = 20

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['admin-orders', page, pageSize, debouncedSearch, statusFilter],
    queryFn: () =>
      listOrders({
        page,
        limit: pageSize,
        search: debouncedSearch || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
    placeholderData: keepPreviousData,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      updateOrderStatus(id, status),
    onSuccess: () => {
      toast.success('Order status updated')
      void queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
    },
    onError: () => toast.error('Failed to update status'),
  })

  const codRemittanceMutation = useMutation({
    mutationFn: ({ id, ref }: { id: string; ref?: string }) => markCodRemitted(id, ref),
    onSuccess: (result) => {
      toast.success(result.message)
      void queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
    },
    onError: () => toast.error('Failed to mark COD as remitted'),
  })

  const orders = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1
  const isInitialLoading = isLoading && orders.length === 0
  const isRefreshing = isFetching && orders.length > 0

  const columns: DataTableColumn<Order>[] = [
    {
      key: 'id',
      header: 'Order ID',
      render: (o) => (
        <span className="font-mono text-xs text-slate-400">{o.id.slice(0, 8)}…</span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (o) => (
        <div>
          <p className="font-medium text-slate-100">{o.user.name}</p>
          <p className="text-xs text-slate-500">{o.user.email ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (o) => <span className="text-slate-300">{o._count.items}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      render: (o) => (
        <span className="font-semibold text-slate-100">₹{parseFloat(o.total).toFixed(2)}</span>
      ),
    },
    {
      key: 'payment',
      header: 'Payment',
      render: (o) => {
        const ps = o.payment?.status ?? 'PENDING'
        const isCod = o.payment?.method === 'COD'
        const method = isCod ? 'COD' : 'Online'
        const canMarkRemitted = isCod && ps === 'PENDING' && o.status === 'DELIVERED'
        return (
          <div className="space-y-1">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${paymentStatusClasses[ps] ?? ''}`}>
              {ps}
            </span>
            <p className="text-[10px] text-slate-500">{method}</p>
            {canMarkRemitted && (
              <button
                onClick={() => {
                  const ref = window.prompt('Shiprocket remittance reference (optional):') ?? undefined
                  codRemittanceMutation.mutate({ id: o.id, ref: ref || undefined })
                }}
                disabled={codRemittanceMutation.isPending}
                className="mt-1 block rounded bg-emerald-600/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-600/30 disabled:opacity-50"
              >
                Mark remitted
              </button>
            )}
          </div>
        )
      },
    },
    {
      key: 'return',
      header: 'Return',
      render: (o) => {
        const latest = o.returnRequests?.[0]
        if (!latest) return <span className="text-xs text-slate-500">—</span>
        return (
          <Link
            to="/dashboard/returns"
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 hover:opacity-90 ${returnStatusClasses[latest.status] ?? ''}`}
          >
            {latest.status}
          </Link>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (o) => {
        const cfg = statusConfig[o.status as OrderStatus]
        return (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${cfg.classes}`}>
            {cfg.icon} {cfg.label}
          </span>
        )
      },
    },
    {
      key: 'date',
      header: 'Date',
      render: (o) => (
        <span className="text-xs text-slate-500">
          {new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Update Status',
      render: (o) => (
        <select
          value={o.status}
          onChange={(e) => updateMutation.mutate({ id: o.id, status: e.target.value as OrderStatus })}
          className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Orders</h1>
          <p className="mt-1 text-sm text-slate-400">
            {total} total order{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2">
          <ShoppingCart size={16} className="text-indigo-400" />
          <span className="text-sm font-semibold text-slate-200">{total}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <FilterBar
          searchId="order-search"
          searchPlaceholder="Search by customer name or email…"
          searchValue={search}
          onSearchChange={setSearch}
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1) }}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="ALL">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>{statusConfig[s].label}</option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-100">
        Return requests are managed on the{' '}
        <Link to="/dashboard/returns" className="font-semibold underline hover:text-white">
          Returns
        </Link>{' '}
        page. Orders with an active return show a badge in the Return column.
      </div>

      {isError && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-sm text-red-400">
          Failed to load orders. Check backend connection.
        </div>
      )}

      {isInitialLoading ? (
        <ListLoader
          label="Loading orders…"
          className="rounded-2xl border border-white/10 bg-white/5"
        />
      ) : (
        <DataTable
          columns={columns}
          rows={orders}
          rowKey={(o) => o.id}
          loading={isRefreshing}
          emptyText={debouncedSearch ? `No orders match "${debouncedSearch}".` : 'No orders found.'}
        />
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 disabled:opacity-40 hover:bg-white/10 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-slate-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 disabled:opacity-40 hover:bg-white/10 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default Orders
