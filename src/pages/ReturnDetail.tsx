import type { ReactElement } from 'react'
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import type { AxiosError } from 'axios'
import { ArrowLeft, Package, User, CreditCard, RotateCcw } from 'lucide-react'
import { getReturn, updateReturnStatus, type ReturnRequest, type ReturnStatus } from '../services/returns'

const statusClasses: Record<ReturnStatus, string> = {
  REQUESTED: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  APPROVED: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
  REJECTED: 'bg-red-500/10 text-red-400 ring-red-500/20',
  RECEIVED: 'bg-violet-500/10 text-violet-400 ring-violet-500/20',
  REFUNDED: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  EXCHANGED: 'bg-indigo-500/10 text-indigo-400 ring-indigo-500/20',
}

const nextActionsFor = (r: ReturnRequest): ReturnStatus[] => {
  const isExchange = r.type === 'EXCHANGE'
  const map: Partial<Record<ReturnStatus, ReturnStatus[]>> = {
    REQUESTED: ['APPROVED', 'REJECTED'],
    APPROVED: ['RECEIVED', 'REJECTED'],
    RECEIVED: isExchange ? ['EXCHANGED'] : ['REFUNDED'],
  }
  return map[r.status] ?? []
}

const ReturnDetail = (): ReactElement => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [adminNote, setAdminNote] = useState('')
  const [noteChanged, setNoteChanged] = useState(false)

  const { data: ret, isLoading, isError } = useQuery({
    queryKey: ['admin-return', id],
    queryFn: () => getReturn(id!),
    enabled: !!id,
  })

  // Sync admin note when data loads
  if (ret && !noteChanged && adminNote !== (ret.adminNote ?? '')) {
    setAdminNote(ret.adminNote ?? '')
  }

  const updateMutation = useMutation({
    mutationFn: ({ status, note }: { status: ReturnStatus; note?: string }) =>
      updateReturnStatus(id!, { status, adminNote: note }),
    onSuccess: (result) => {
      toast.success(result.message)
      void queryClient.invalidateQueries({ queryKey: ['admin-return', id] })
      void queryClient.invalidateQueries({ queryKey: ['admin-returns'] })
    },
    onError: (error: AxiosError<{ message?: string | string[] }>) => {
      const raw = error.response?.data?.message
      const message = Array.isArray(raw) ? raw.join(', ') : raw ?? 'Failed to update return'
      toast.error(message)
    },
  })

  const saveMutation = useMutation({
    mutationFn: (note: string) =>
      updateReturnStatus(id!, { status: ret!.status, adminNote: note }),
    onSuccess: () => {
      toast.success('Note saved')
      setNoteChanged(false)
      void queryClient.invalidateQueries({ queryKey: ['admin-return', id] })
    },
    onError: () => toast.error('Failed to save note'),
  })

  const handleStatusAction = (status: ReturnStatus) => {
    if (!ret) return
    const isExchange = ret.type === 'EXCHANGE'
    const payment = ret.order.payment

    if (status === 'APPROVED') {
      const confirmed = window.confirm(
        `Approve this ${isExchange ? 'size exchange' : 'return'} and create a Shiprocket reverse pickup?\n\nCustomer: ${ret.user.name}\nOrder: ${ret.orderId.slice(0, 8)}…${isExchange ? `\nRequested size: ${ret.exchangeSize}` : ''}`,
      )
      if (!confirmed) return
    }
    if (status === 'EXCHANGED') {
      const confirmed = window.confirm(
        `Dispatch size ${ret.exchangeSize} to the customer via Shiprocket?\n\nThis will create a new forward shipment. Make sure the item is packed and ready.`,
      )
      if (!confirmed) return
    }
    if (status === 'REFUNDED' && payment?.method === 'ONLINE' && payment.status === 'PAID') {
      const amount = (payment.amount / 100).toFixed(2)
      const confirmed = window.confirm(`Refund ₹${amount} to customer via Razorpay for order ${ret.orderId.slice(0, 8)}…?`)
      if (!confirmed) return
    }
    if (status === 'REJECTED') {
      const confirmed = window.confirm('Reject this return request?')
      if (!confirmed) return
    }

    updateMutation.mutate({ status, note: adminNote || undefined })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        Loading return details…
      </div>
    )
  }

  if (isError || !ret) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-8 text-center text-sm text-red-400">
        Failed to load return request.{' '}
        <button onClick={() => navigate(-1)} className="underline">Go back</button>
      </div>
    )
  }

  const nextActions = nextActionsFor(ret)
  const isExchange = ret.type === 'EXCHANGE'
  const payment = ret.order.payment

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"
      >
        <ArrowLeft size={16} /> Back to Returns
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="font-mono text-xs text-slate-500">Return ID</p>
          <p className="font-mono text-base font-bold text-white">{ret.id}</p>
          <div className="flex flex-wrap items-center gap-2">
            {isExchange ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-300 ring-1 ring-indigo-500/25">
                🔄 Exchange
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/20">
                ↩️ Return
              </span>
            )}
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusClasses[ret.status]}`}>
              {ret.status}
            </span>
            <span className="text-xs text-slate-500">
              Requested {new Date(ret.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Customer info */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <User size={15} className="text-indigo-400" /> Customer
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium text-slate-200">{ret.user.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Email</dt>
              <dd className="font-medium text-slate-200">{ret.user.email ?? '—'}</dd>
            </div>
          </dl>
        </div>

        {/* Order info */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <CreditCard size={15} className="text-emerald-400" /> Order Info
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Order ID</dt>
              <dd className="font-mono text-xs text-slate-300">{ret.orderId}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Order Total</dt>
              <dd className="font-semibold text-white">₹{parseFloat(ret.order.total).toFixed(2)}</dd>
            </div>
            {payment && (
              <>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Payment Method</dt>
                  <dd className="text-slate-300">{payment.method === 'COD' ? 'Cash on Delivery' : 'Online (Razorpay)'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Payment Status</dt>
                  <dd className="text-slate-300">{payment.status}</dd>
                </div>
                {payment.razorpayRefundId && (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Refund ID</dt>
                    <dd className="font-mono text-xs text-emerald-400">{payment.razorpayRefundId}</dd>
                  </div>
                )}
              </>
            )}
          </dl>
        </div>
      </div>

      {/* Items */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
          <Package size={15} className="text-cyan-400" /> Returned Item(s)
        </h2>
        {isExchange && ret.exchangeSize && (
          <div className="mb-4 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-200">
            Size exchange requested:{' '}
            <span className="font-semibold text-white">→ {ret.exchangeSize}</span>
          </div>
        )}
        <p className="text-sm text-slate-400">Return reason: <span className="text-slate-200">{ret.reason}</span></p>
      </div>

      {/* Shiprocket tracking */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
          <RotateCcw size={15} className="text-violet-400" /> Shiprocket Tracking
        </h2>
        <div className="space-y-3 text-sm">
          {ret.returnAwbCode ? (
            <div className="flex items-center gap-3">
              <span className="text-slate-500">↩ Reverse pickup AWB:</span>
              <a
                href={`https://shiprocket.co/tracking/${ret.returnAwbCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-blue-400 hover:underline"
              >
                {ret.returnAwbCode}
              </a>
              {ret.returnCourierName && <span className="text-slate-500">({ret.returnCourierName})</span>}
            </div>
          ) : ret.returnShipmentId ? (
            <p className="text-slate-500">↩ Pickup created — AWB pending</p>
          ) : (
            <p className="text-slate-600">No reverse pickup yet</p>
          )}

          {ret.exchangeAwbCode ? (
            <div className="flex items-center gap-3">
              <span className="text-slate-500">🔄 Exchange dispatch AWB:</span>
              <a
                href={`https://shiprocket.co/tracking/${ret.exchangeAwbCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-indigo-400 hover:underline"
              >
                {ret.exchangeAwbCode}
              </a>
              {ret.exchangeCourierName && <span className="text-slate-500">({ret.exchangeCourierName})</span>}
            </div>
          ) : ret.exchangeShipmentId ? (
            <p className="text-slate-500">🔄 Exchange shipment created — AWB pending</p>
          ) : null}
        </div>
      </div>

      {/* Admin note */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="mb-3 text-sm font-semibold text-white">Admin Note</h2>
        <textarea
          value={adminNote}
          onChange={(e) => { setAdminNote(e.target.value); setNoteChanged(true) }}
          rows={3}
          placeholder="Internal note about this return…"
          className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {noteChanged && (
          <button
            type="button"
            onClick={() => saveMutation.mutate(adminNote)}
            disabled={saveMutation.isPending}
            className="mt-2 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving…' : 'Save note'}
          </button>
        )}
      </div>

      {/* Actions */}
      {nextActions.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Actions</h2>
          <div className="flex flex-wrap gap-3">
            {nextActions.map((status) => {
              const label =
                status === 'APPROVED' ? `Approve + create pickup` :
                status === 'RECEIVED' ? 'Mark Received' :
                status === 'EXCHANGED' ? `Dispatch size ${ret.exchangeSize} →` :
                status === 'REFUNDED' && payment?.method === 'ONLINE' ? 'Refund via Razorpay' :
                status === 'REFUNDED' ? 'Mark Refunded (COD)' :
                status === 'REJECTED' ? 'Reject' :
                `Mark ${status}`
              const isDanger = status === 'REJECTED'
              const isMain = status === 'APPROVED' || status === 'EXCHANGED' || status === 'REFUNDED'
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleStatusAction(status)}
                  disabled={updateMutation.isPending}
                  className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                    isDanger
                      ? 'border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                      : isMain
                      ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                      : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  {updateMutation.isPending ? 'Processing…' : label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {nextActions.length === 0 && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-300">
          {ret.status === 'EXCHANGED' ? '✓ Size exchange completed' :
           ret.status === 'REFUNDED' ? '✓ Refund processed' :
           ret.status === 'REJECTED' ? 'This return was rejected.' :
           `Status: ${ret.status}`}
        </div>
      )}
    </div>
  )
}

export default ReturnDetail
