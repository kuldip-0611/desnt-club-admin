import type { ReactElement } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'

const SHIPPING_STATUS_CFG: Record<string, { label: string; classes: string }> = {
  'LABEL GENERATED':   { label: 'Label Generated',   classes: 'bg-slate-500/10 text-slate-400 ring-slate-500/20' },
  'PICKUP SCHEDULED':  { label: 'Pickup Scheduled',  classes: 'bg-sky-500/10 text-sky-400 ring-sky-500/20' },
  'PICKUP GENERATED':  { label: 'Pickup Generated',  classes: 'bg-sky-500/10 text-sky-400 ring-sky-500/20' },
  'READY TO SHIP':     { label: 'Ready to Ship',     classes: 'bg-sky-500/10 text-sky-400 ring-sky-500/20' },
  'PICKED UP':         { label: 'Picked Up',         classes: 'bg-indigo-500/10 text-indigo-400 ring-indigo-500/20' },
  'MANIFESTED':        { label: 'Manifested',        classes: 'bg-indigo-500/10 text-indigo-400 ring-indigo-500/20' },
  'SHIPPED':           { label: 'Shipped',           classes: 'bg-cyan-500/10 text-cyan-400 ring-cyan-500/20' },
  'IN TRANSIT':        { label: 'In Transit',        classes: 'bg-cyan-500/10 text-cyan-400 ring-cyan-500/20' },
  'OUT FOR DELIVERY':  { label: 'Out for Delivery',  classes: 'bg-amber-500/10 text-amber-400 ring-amber-500/20' },
  'NDR':               { label: 'Delivery Failed',   classes: 'bg-orange-500/10 text-orange-400 ring-orange-500/20' },
  'DELIVERED':         { label: 'Delivered',         classes: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' },
  'RTO INITIATED':     { label: 'RTO Initiated',     classes: 'bg-red-500/10 text-red-400 ring-red-500/20' },
  'RTO DELIVERED':     { label: 'RTO Delivered',     classes: 'bg-red-500/10 text-red-400 ring-red-500/20' },
  'CANCELLED':         { label: 'Cancelled',         classes: 'bg-red-500/10 text-red-400 ring-red-500/20' },
}
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { ArrowLeft, Package, User, CreditCard, MapPin, Tag, Truck, Printer } from 'lucide-react'
import { getOrder, updateOrderStatus, downloadPackingSlip, downloadShippingLabel, downloadGeneratedLabel, type OrderDetail as OrderDetailData } from '../services/orders'
import { apiErrorMessage } from '../services/api'
import { useState } from 'react'

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'] as const
type OrderStatus = (typeof ORDER_STATUSES)[number]

const statusClasses: Record<OrderStatus, string> = {
  PENDING:    'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  CONFIRMED:  'bg-blue-500/10 text-blue-400 ring-blue-500/20',
  PROCESSING: 'bg-violet-500/10 text-violet-400 ring-violet-500/20',
  SHIPPED:    'bg-cyan-500/10 text-cyan-400 ring-cyan-500/20',
  DELIVERED:  'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  CANCELLED:  'bg-red-500/10 text-red-400 ring-red-500/20',
  REFUNDED:   'bg-slate-500/10 text-slate-400 ring-slate-500/20',
}

const paymentStatusClasses: Record<string, string> = {
  PAID:    'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  PENDING: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
  FAILED:  'bg-red-500/10 text-red-400 ring-red-500/20',
  REFUNDED:'bg-slate-500/10 text-slate-400 ring-slate-500/20',
}

const OrderDetail = (): ReactElement => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [printingId, setPrintingId] = useState(false)
  const [labelLoading, setLabelLoading] = useState(false)

  const { data: order, isLoading, isError } = useQuery<OrderDetailData>({
    queryKey: ['admin-order', id],
    queryFn: () => getOrder(id!),
    enabled: !!id,
  })

  const updateMutation = useMutation({
    mutationFn: (status: OrderStatus) => updateOrderStatus(id!, status),
    onSuccess: () => {
      toast.success('Order status updated')
      void queryClient.invalidateQueries({ queryKey: ['admin-order', id] })
      void queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
    },
    onError: () => toast.error('Failed to update status'),
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        Loading order details…
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-6 py-8 text-center text-sm text-red-400">
        Failed to load order.{' '}
        <button onClick={() => navigate(-1)} className="underline">Go back</button>
      </div>
    )
  }

  const addr = order.shippingAddress
  const subtotal = parseFloat(order.subtotal)
  const discount = parseFloat(order.discountAmount)
  const total = parseFloat(order.total)

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"
      >
        <ArrowLeft size={16} /> Back to Orders
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="font-mono text-xs text-slate-500">Order ID</p>
          <p className="font-mono text-base font-bold text-white">{order.id}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusClasses[order.status as OrderStatus] ?? ''}`}>
              {order.status}
            </span>
            <span className="text-xs text-slate-500">
              {new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Status updater */}
        <div className="flex items-center gap-3">
          <select
            value={order.status}
            onChange={(e) => updateMutation.mutate(e.target.value as OrderStatus)}
            disabled={updateMutation.isPending}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={printingId}
            onClick={async () => {
              setPrintingId(true)
              try { await downloadPackingSlip(order.id) }
              catch { toast.error('Failed to download packing slip') }
              finally { setPrintingId(false) }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 hover:bg-indigo-500/20 hover:text-indigo-300 disabled:opacity-50"
          >
            <Printer size={14} />
            {printingId ? 'Downloading…' : 'Print Bill'}
          </button>
          <button
            type="button"
            disabled={labelLoading}
            onClick={async () => {
              setLabelLoading(true)
              try {
                // Shiprocket label first (has routing codes + proper branding) — ready after pickup scheduled
                if (order.shiprocketShipmentId) {
                  await downloadShippingLabel(order.id)
                } else {
                  await downloadGeneratedLabel(order.id)
                }
              } catch {
                // Pickup not yet scheduled — fall back to custom PDF
                try { await downloadGeneratedLabel(order.id) }
                catch (err) { toast.error(apiErrorMessage(err, 'Failed to generate label')) }
              } finally {
                setLabelLoading(false)
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
          >
            <Tag size={14} />
            {labelLoading ? 'Getting label…' : 'Print Label'}
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Customer */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <User size={15} className="text-indigo-400" /> Customer
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Name</dt>
              <dd className="font-medium text-slate-200">{order.user.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Email</dt>
              <dd className="text-slate-200">{order.user.email ?? '—'}</dd>
            </div>
          </dl>
        </div>

        {/* Payment */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <CreditCard size={15} className="text-emerald-400" /> Payment
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Method</dt>
              <dd className="text-slate-200">
                {order.payment?.method === 'COD' ? 'Cash on Delivery' : order.payment?.method ? 'Online (Razorpay)' : '—'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Status</dt>
              <dd>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${paymentStatusClasses[order.payment?.status ?? 'PENDING'] ?? ''}`}>
                  {order.payment?.status ?? 'PENDING'}
                </span>
              </dd>
            </div>
            {order.payment?.razorpayRefundId && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Refund ID</dt>
                <dd className="font-mono text-xs text-emerald-400">{order.payment.razorpayRefundId}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Shipping address */}
      {addr && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <MapPin size={15} className="text-rose-400" /> Shipping Address
          </h2>
          <p className="text-sm text-slate-200 leading-relaxed">
            {[addr.name, addr.phone, addr.line1, addr.line2, addr.city, addr.state, addr.pincode, addr.country]
              .filter(Boolean)
              .join(', ')}
          </p>
        </div>
      )}

      {/* Tracking */}
      {(order.awbCode || order.shiprocketShipmentId || order.shippingStatus) && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
            <Truck size={15} className="text-cyan-400" /> Shipment Tracking
          </h2>
          <dl className="space-y-2 text-sm">
            {order.shippingStatus && (
              <div className="flex justify-between items-center">
                <dt className="text-slate-500">Shiprocket Status</dt>
                <dd>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${SHIPPING_STATUS_CFG[order.shippingStatus.toUpperCase()]?.classes ?? 'bg-slate-500/10 text-slate-400 ring-slate-500/20'}`}>
                    {SHIPPING_STATUS_CFG[order.shippingStatus.toUpperCase()]?.label ?? order.shippingStatus}
                  </span>
                </dd>
              </div>
            )}
            {order.awbCode && (
              <div className="flex justify-between">
                <dt className="text-slate-500">AWB Code</dt>
                <dd className="font-mono text-cyan-400">{order.awbCode}</dd>
              </div>
            )}
            {order.courierName && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Courier</dt>
                <dd className="text-slate-300">{order.courierName}</dd>
              </div>
            )}
            {order.shiprocketShipmentId && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Shiprocket ID</dt>
                <dd className="font-mono text-xs text-slate-300">{order.shiprocketShipmentId}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Items */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
          <Package size={15} className="text-cyan-400" /> Order Items ({order.items.length})
        </h2>
        <div className="divide-y divide-white/5">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 py-3">
              {item.product.images[0] && (
                <img
                  src={item.product.images[0].path}
                  alt={item.product.name}
                  className="h-14 w-14 flex-shrink-0 rounded-xl object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-slate-100">{item.product.name}</p>
                <p className="text-xs text-slate-500">
                  {[item.size && `Size: ${item.size}`, item.color && `Color: ${item.color}`].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">₹{parseFloat(item.price).toFixed(2)}</p>
                <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="mt-4 space-y-1.5 border-t border-white/10 pt-4 text-sm">
          <div className="flex justify-between text-slate-400">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>
                Discount {order.coupon ? `(${order.coupon.code})` : ''}
              </span>
              <span>−₹{discount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-white/10 pt-2 text-base font-bold text-white">
            <span>Total</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Return requests */}
      {order.returnRequests.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 text-sm font-semibold text-white">Return / Exchange Requests</h2>
          <div className="space-y-2">
            {order.returnRequests.map((r) => (
              <Link
                key={r.id}
                to={`/dashboard/returns/${r.id}`}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm hover:bg-white/10 transition"
              >
                <span className="font-mono text-xs text-slate-400">{r.id.slice(0, 8)}…</span>
                <span className="text-slate-400">{r.type} · {r.reason}</span>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400 ring-1 ring-amber-500/20">
                  {r.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Cancel reason */}
      {order.cancelReason && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          <span className="font-semibold">Cancel reason:</span> {order.cancelReason}
        </div>
      )}
    </div>
  )
}

export default OrderDetail
