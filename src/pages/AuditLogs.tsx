import type { ReactElement } from 'react'
import { useState } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import api from '../services/api'
import ListLoader from '../components/ui/ListLoader'

type AuditLog = {
  id: string
  adminId: string
  adminName: string
  adminEmail: string
  action: string
  targetType: string
  targetId: string | null
  targetLabel: string | null
  detail: string | null
  ipAddress: string | null
  createdAt: string
}

type AuditLogResponse = {
  items: AuditLog[]
  total: number
  page: number
  totalPages: number
}

const ACTION_COLORS: Record<string, string> = {
  ORDER_STATUS_CHANGED: 'bg-blue-100 text-blue-800',
  ORDER_BULK_STATUS_CHANGED: 'bg-blue-100 text-blue-800',
  ORDER_COD_REMITTED: 'bg-teal-100 text-teal-800',
  RETURN_STATUS_CHANGED: 'bg-orange-100 text-orange-800',
  PRODUCT_CREATED: 'bg-emerald-100 text-emerald-800',
  PRODUCT_UPDATED: 'bg-yellow-100 text-yellow-800',
  PRODUCT_DELETED: 'bg-red-100 text-red-800',
  PRODUCT_IMAGE_DELETED: 'bg-red-50 text-red-700',
  COUPON_CREATED: 'bg-emerald-100 text-emerald-800',
  COUPON_UPDATED: 'bg-yellow-100 text-yellow-800',
  COUPON_DELETED: 'bg-red-100 text-red-800',
  ADMIN_LOGIN: 'bg-slate-100 text-slate-700',
}

const ACTION_LABELS: Record<string, string> = {
  ORDER_STATUS_CHANGED: 'Order Status',
  ORDER_BULK_STATUS_CHANGED: 'Bulk Status',
  ORDER_COD_REMITTED: 'COD Remitted',
  RETURN_STATUS_CHANGED: 'Return Status',
  PRODUCT_CREATED: 'Product Created',
  PRODUCT_UPDATED: 'Product Updated',
  PRODUCT_DELETED: 'Product Deleted',
  PRODUCT_IMAGE_DELETED: 'Image Deleted',
  COUPON_CREATED: 'Coupon Created',
  COUPON_UPDATED: 'Coupon Updated',
  COUPON_DELETED: 'Coupon Deleted',
  ADMIN_LOGIN: 'Admin Login',
}

const ALL_ACTIONS = [
  'ORDER_STATUS_CHANGED', 'ORDER_BULK_STATUS_CHANGED', 'ORDER_COD_REMITTED',
  'RETURN_STATUS_CHANGED', 'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DELETED',
  'PRODUCT_IMAGE_DELETED', 'COUPON_CREATED', 'COUPON_UPDATED', 'COUPON_DELETED', 'ADMIN_LOGIN',
]

const AuditLogs = (): ReactElement => {
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('')
  const [targetType, setTargetType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data, isLoading, isFetching, isError } = useQuery<AuditLogResponse>({
    queryKey: ['audit-logs', page, action, targetType, from, to],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit: 50 }
      if (action) params.action = action
      if (targetType) params.targetType = targetType
      if (from) params.from = from
      if (to) params.to = to
      const { data } = await api.get<AuditLogResponse>('/admin/audit-logs', { params })
      return data
    },
    placeholderData: keepPreviousData,
  })

  const logs = data?.items ?? []
  const isInitialLoading = isLoading && logs.length === 0
  const isRefreshing = isFetching && logs.length > 0

  const handleFilterChange = () => setPage(1)

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-800">
        Could not load audit logs. Check admin auth and backend API.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Audit Logs</h1>
        <p className="mt-1 text-sm text-slate-600">
          Track all admin actions across orders, products, coupons, and more.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Action</label>
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); handleFilterChange() }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Actions</option>
            {ALL_ACTIONS.map((a) => (
              <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">Target Type</label>
          <select
            value={targetType}
            onChange={(e) => { setTargetType(e.target.value); handleFilterChange() }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Types</option>
            <option value="ORDER">Order</option>
            <option value="RETURN">Return</option>
            <option value="PRODUCT">Product</option>
            <option value="COUPON">Coupon</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); handleFilterChange() }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); handleFilterChange() }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {(action || targetType || from || to) && (
          <button
            type="button"
            onClick={() => { setAction(''); setTargetType(''); setFrom(''); setTo(''); setPage(1) }}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Clear filters
          </button>
        )}

        <span className="ml-auto text-sm text-slate-500">{data?.total ?? 0} entries</span>
      </div>

      {isInitialLoading ? (
        <ListLoader label="Loading audit logs…" />
      ) : logs.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No audit log entries found.
        </p>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {isRefreshing && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Time</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Admin</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Action</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Target</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Detail</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => {
                let detail: Record<string, unknown> | null = null
                try { if (log.detail) detail = JSON.parse(log.detail) as Record<string, unknown> } catch { /* ignore */ }
                return (
                  <tr key={log.id} className="transition hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {new Date(log.createdAt).toLocaleString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{log.adminName}</p>
                      <p className="text-xs text-slate-500">{log.adminEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] ?? 'bg-slate-100 text-slate-700'}`}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {log.targetLabel ? (
                        <p className="font-medium text-slate-800">{log.targetLabel}</p>
                      ) : null}
                      <p className="text-xs text-slate-500">{log.targetType}{log.targetId ? ` · ${log.targetId.slice(0, 8).toUpperCase()}` : ''}</p>
                    </td>
                    <td className="max-w-[200px] px-4 py-3">
                      {detail ? (
                        <pre className="whitespace-pre-wrap break-all text-xs text-slate-600">
                          {JSON.stringify(detail, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {log.ipAddress ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {(data?.totalPages ?? 1) > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
          <span className="text-slate-600">
            Page {data?.page ?? 1} of {data?.totalPages ?? 1} · {data?.total ?? 0} entries
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
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
      )}
    </div>
  )
}

export default AuditLogs
