import type { ReactElement } from 'react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { RotateCcw } from 'lucide-react'
import type { AxiosError } from 'axios'
import DataTable, { type DataTableColumn } from '../components/ui/DataTable'
import { listReturns, updateReturnStatus, type ReturnRequest, type ReturnStatus } from '../services/returns'

const RETURN_STATUSES: ReturnStatus[] = ['REQUESTED', 'APPROVED', 'REJECTED', 'RECEIVED', 'REFUNDED']

const statusClasses: Record<ReturnStatus, string> = {
  REQUESTED: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  APPROVED: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
  REJECTED: 'bg-red-500/10 text-red-400 ring-red-500/20',
  RECEIVED: 'bg-violet-500/10 text-violet-400 ring-violet-500/20',
  REFUNDED: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
}

const nextActions: Partial<Record<ReturnStatus, ReturnStatus[]>> = {
  REQUESTED: ['APPROVED', 'REJECTED'],
  APPROVED: ['RECEIVED', 'REJECTED'],
  RECEIVED: ['REFUNDED'],
}

const paymentLabel = (method: 'ONLINE' | 'COD' | undefined) =>
  method === 'COD' ? 'Cash on delivery' : 'Online (Razorpay)'

const Returns = (): ReactElement => {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'ALL' | ReturnStatus>('ALL')
  const pageSize = 20

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-returns', page, pageSize, statusFilter],
    queryFn: () =>
      listReturns({
        page,
        limit: pageSize,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReturnStatus }) =>
      updateReturnStatus(id, { status }),
    onSuccess: (result) => {
      toast.success(result.message)
      void queryClient.invalidateQueries({ queryKey: ['admin-returns'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-dashboard-overview'] })
    },
    onError: (error: AxiosError<{ message?: string | string[] }>) => {
      const raw = error.response?.data?.message
      const message = Array.isArray(raw) ? raw.join(', ') : raw ?? 'Failed to update return'
      toast.error(message)
    },
  })

  const handleStatusChange = (returnRequest: ReturnRequest, status: ReturnStatus) => {
    if (!status) return

    const payment = returnRequest.order.payment
    if (status === 'REFUNDED' && payment?.method === 'ONLINE' && payment.status === 'PAID') {
      const amount = (payment.amount / 100).toFixed(2)
      const confirmed = window.confirm(
        `Refund ₹${amount} to customer via Razorpay for order ${returnRequest.orderId.slice(0, 8)}…?`,
      )
      if (!confirmed) return
    }

    updateMutation.mutate({ id: returnRequest.id, status })
  }

  const returns = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1
  const pendingCount = returns.filter((r) =>
    ['REQUESTED', 'APPROVED', 'RECEIVED'].includes(r.status),
  ).length

  const columns: DataTableColumn<ReturnRequest>[] = [
    {
      key: 'id',
      header: 'Return ID',
      render: (r) => <span className="font-mono text-xs text-slate-400">{r.id.slice(0, 8)}…</span>,
    },
    {
      key: 'order',
      header: 'Order',
      render: (r) => (
        <span className="font-mono text-xs text-slate-300">{r.orderId.slice(0, 8)}…</span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (r) => (
        <div>
          <p className="font-medium text-slate-100">{r.user.name}</p>
          <p className="text-xs text-slate-500">{r.user.email ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (r) =>
        r.type === 'EXCHANGE' ? (
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs font-semibold text-indigo-300 ring-1 ring-indigo-500/25">
              🔄 Exchange
            </span>
            <p className="mt-0.5 text-xs text-indigo-400">→ size {r.exchangeSize}</p>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/20">
            ↩️ Return
          </span>
        ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (r) => (
        <p className="max-w-xs truncate text-sm text-slate-300" title={r.reason}>
          {r.reason}
        </p>
      ),
    },
    {
      key: 'payment',
      header: 'Payment',
      render: (r) => {
        const payment = r.order.payment
        if (!payment) return <span className="text-xs text-slate-500">—</span>
        const isSimulated =
          !payment.razorpayPaymentId ||
          payment.razorpayPaymentId.startsWith('pay_test_') ||
          payment.razorpayPaymentId.includes('_review_')
        return (
          <div>
            <p className="text-xs text-slate-300">{paymentLabel(payment.method)}</p>
            <p className="text-xs text-slate-500">{payment.status}</p>
            {isSimulated ? (
              <p className="text-[10px] text-amber-400">Not in Razorpay</p>
            ) : payment.razorpayRefundId ? (
              <p className="text-[10px] text-emerald-400" title={payment.razorpayRefundId}>
                RZP refunded
              </p>
            ) : null}
          </div>
        )
      },
    },
    {
      key: 'total',
      header: 'Order total',
      render: (r) => <span className="text-slate-200">₹{parseFloat(r.order.total).toFixed(0)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${statusClasses[r.status]}`}>
          {r.status}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Requested',
      render: (r) => (
        <span className="text-xs text-slate-500">
          {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Action',
      render: (r) => {
        const options = nextActions[r.status] ?? []
        if (options.length === 0) {
          if (r.order.payment?.razorpayRefundId) {
            return (
              <span className="text-xs text-emerald-400" title={r.order.payment.razorpayRefundId}>
                Refunded
              </span>
            )
          }
          return <span className="text-xs text-slate-500">—</span>
        }
        return (
          <select
            value=""
            disabled={updateMutation.isPending}
            onChange={(e) => {
              const status = e.target.value as ReturnStatus
              if (status) handleStatusChange(r, status)
            }}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200"
          >
            <option value="">Update…</option>
            {options.map((s) => (
              <option key={s} value={s}>
                Mark {s}
                {s === 'REFUNDED' && r.order.payment?.method === 'ONLINE' ? ' (+ Razorpay)' : ''}
              </option>
            ))}
          </select>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Returns</h1>
          <p className="mt-1 text-sm text-slate-400">
            {total} return request{total !== 1 ? 's' : ''}
            {statusFilter === 'ALL' && pendingCount > 0 ? ` · ${pendingCount} on this page need action` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2">
          <RotateCcw size={16} className="text-indigo-400" />
          <span className="text-sm font-semibold text-slate-200">{total}</span>
        </div>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        <p>
          Process returns: <strong>Approve</strong> → <strong>Mark received</strong> → <strong>Refund</strong>.
          Online payments are refunded via Razorpay automatically.
        </p>
        <p className="mt-1 text-amber-200/80">
          🔄 <strong>Exchange requests</strong> — Approve to confirm the swap, then ship the new size to the customer
          and mark Received once you get the old item back.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as typeof statusFilter)
            setPage(1)
          }}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"
        >
          <option value="ALL">All statuses</option>
          {RETURN_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void refetch()}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-white/10"
        >
          Refresh
        </button>
      </div>

      {isError ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-4 text-sm text-red-400">
          Failed to load returns. Check that you are logged in as admin and the backend is running.
        </div>
      ) : null}

      <DataTable
        columns={columns}
        rows={returns}
        rowKey={(r) => r.id}
        emptyText={isLoading ? 'Loading returns…' : 'No return requests yet.'}
      />

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-slate-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  )
}

export default Returns
