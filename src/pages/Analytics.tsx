import { useState } from 'react'
import type { ReactElement } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { TrendingUp, ShoppingCart, Users, Package, BarChart2 } from 'lucide-react'
import api from '../services/api'
import { productImageUrl } from '../services/products'

type Period = 'daily' | 'weekly' | 'monthly'

type AnalyticsData = {
  period: Period
  revenueChart: { label: string; revenue: number }[]
  orderCountChart: { label: string; orders: number }[]
  newUsersChart: { label: string; users: number }[]
  ordersByStatus: { status: string; count: number }[]
  topProducts: { productId: string; name: string; image: string | null; revenue: number; unitsSold: number }[]
  couponStats: { code: string; usedCount: number; redemptions: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  CONFIRMED: '#3b82f6',
  PROCESSING: '#8b5cf6',
  SHIPPED: '#06b6d4',
  DELIVERED: '#10b981',
  CANCELLED: '#ef4444',
  REFUNDED: '#6b7280',
}

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#84cc16']

const formatRevenue = (v: number) =>
  v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(1)}K` : `₹${v}`

const formatLabel = (label: string, period: Period): string => {
  if (period === 'monthly') {
    const [year, month] = label.split('-')
    return new Date(Number(year), Number(month) - 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
  }
  if (period === 'weekly') {
    return new Date(label).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
  }
  return new Date(label).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

const KpiCard = ({
  label, value, sub, icon, tone = 'default',
}: {
  label: string; value: string; sub?: string; icon: ReactElement; tone?: 'default' | 'success' | 'info' | 'warning'
}) => {
  const tones = {
    default: 'bg-slate-700/40 text-slate-400',
    success: 'bg-emerald-500/10 text-emerald-400',
    info: 'bg-indigo-500/10 text-indigo-400',
    warning: 'bg-amber-500/10 text-amber-400',
  }
  return (
    <div className={`rounded-xl p-3.5 ring-1 ring-white/10 sm:rounded-2xl sm:p-5 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold uppercase tracking-wide opacity-70 sm:text-xs">{label}</p>
          <p className="mt-1.5 text-xl font-black text-white sm:mt-2 sm:text-2xl">{value}</p>
          {sub && <p className="mt-0.5 text-[10px] opacity-60 sm:text-xs">{sub}</p>}
        </div>
        <div className="shrink-0 rounded-lg bg-white/10 p-2 sm:rounded-xl sm:p-2.5">{icon}</div>
      </div>
    </div>
  )
}

const Analytics = (): ReactElement => {
  const [period, setPeriod] = useState<Period>('daily')

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['admin-analytics', period],
    queryFn: async () => {
      const { data } = await api.get<AnalyticsData>('/admin/dashboard/analytics', { params: { period } })
      return data
    },
  })

  const totalRevenue = data?.revenueChart.reduce((s, d) => s + d.revenue, 0) ?? 0
  const totalOrders = data?.orderCountChart.reduce((s, d) => s + d.orders, 0) ?? 0
  const totalNewUsers = data?.newUsersChart.reduce((s, d) => s + d.users, 0) ?? 0

  const chartLabels = (data?.revenueChart ?? []).map((d) => ({
    ...d,
    shortLabel: formatLabel(d.label, period),
  }))
  const orderLabels = (data?.orderCountChart ?? []).map((d) => ({
    ...d,
    shortLabel: formatLabel(d.label, period),
  }))
  const userLabels = (data?.newUsersChart ?? []).map((d) => ({
    ...d,
    shortLabel: formatLabel(d.label, period),
  }))

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white sm:text-3xl">Analytics</h1>
          <p className="mt-0.5 text-sm text-slate-400">Revenue, orders, and growth trends</p>
        </div>
        <div className="flex rounded-xl border border-white/10 bg-white/5 p-1">
          {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition sm:px-4 sm:text-sm ${
                period === p
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <KpiCard
          label={`Total revenue (${period})`}
          value={formatRevenue(totalRevenue)}
          icon={<TrendingUp size={18} className="text-indigo-400" />}
          tone="info"
        />
        <KpiCard
          label={`Orders (${period})`}
          value={String(totalOrders)}
          icon={<ShoppingCart size={18} className="text-emerald-400" />}
          tone="success"
        />
        <KpiCard
          label={`New users (${period})`}
          value={String(totalNewUsers)}
          icon={<Users size={18} className="text-amber-400" />}
          tone="warning"
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20 text-slate-400">Loading analytics…</div>
      )}

      {!isLoading && data && (
        <>
          {/* Revenue chart */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:rounded-2xl sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white sm:mb-5 sm:text-base">
              <TrendingUp size={15} className="text-indigo-400" /> Revenue
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartLabels}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="shortLabel" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={formatRevenue} tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} width={42} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                  labelStyle={{ color: '#f8fafc' }}
                  formatter={(v: number) => [formatRevenue(v), 'Revenue']}
                />
                <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Orders + Users charts — stack on mobile, side by side on desktop */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:rounded-2xl sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white sm:mb-5 sm:text-base">
                <ShoppingCart size={15} className="text-emerald-400" /> Orders
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={orderLabels} barSize={period === 'daily' ? 5 : 14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="shortLabel" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                    labelStyle={{ color: '#f8fafc' }}
                  />
                  <Bar dataKey="orders" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:rounded-2xl sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white sm:mb-5 sm:text-base">
                <Users size={15} className="text-amber-400" /> New Users
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={userLabels} barSize={period === 'daily' ? 5 : 14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="shortLabel" tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                    labelStyle={{ color: '#f8fafc' }}
                  />
                  <Bar dataKey="users" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Orders by status (pie) + Top products */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:rounded-2xl sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white sm:mb-5 sm:text-base">
                <BarChart2 size={15} className="text-violet-400" /> Orders by status
              </h2>
              {/* Pie + legend: stack vertically on very small, row on wider */}
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
                <div className="w-full max-w-[180px] sm:w-[50%] sm:max-w-none">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={data.ordersByStatus}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={68}
                      >
                        {data.ordersByStatus.map((entry) => (
                          <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#6b7280'} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full space-y-1.5 text-xs sm:flex-1 sm:space-y-2">
                  {data.ordersByStatus.map((entry) => (
                    <div key={entry.status} className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[entry.status] ?? '#6b7280' }}
                      />
                      <span className="text-slate-300">{entry.status}</span>
                      <span className="ml-auto font-bold text-white">{entry.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:rounded-2xl sm:p-6">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white sm:mb-5 sm:text-base">
                <Package size={15} className="text-cyan-400" /> Top products
              </h2>
              <div className="space-y-2.5 sm:space-y-3">
                {data.topProducts.slice(0, 6).map((p, i) => (
                  <div key={p.productId} className="flex items-center gap-2 text-xs sm:gap-3 sm:text-sm">
                    <span className="w-4 flex-shrink-0 text-center text-[10px] font-bold text-slate-500 sm:w-5 sm:text-xs">
                      {i + 1}
                    </span>
                    {p.image && (
                      <img src={productImageUrl(p.image!)} alt={p.name} className="h-7 w-7 flex-shrink-0 rounded-md object-cover sm:h-8 sm:w-8 sm:rounded-lg" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-slate-200">{p.name}</span>
                    <div className="shrink-0 text-right">
                      <p className="font-bold text-white">{formatRevenue(p.revenue)}</p>
                      <p className="text-[10px] text-slate-500">{p.unitsSold} sold</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coupon usage */}
          {data.couponStats.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:rounded-2xl sm:p-6">
              <h2 className="mb-4 text-sm font-semibold text-white sm:text-base">Coupon usage</h2>
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs text-slate-500">
                      <th className="pb-3 pr-4 font-medium">Code</th>
                      <th className="pb-3 pr-4 font-medium">Total used</th>
                      <th className="pb-3 font-medium">Redemptions (unique users)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.couponStats.map((c, i) => (
                      <tr key={c.code} className={i % 2 === 0 ? '' : 'bg-white/[0.02]'}>
                        <td className="py-2 pr-4 font-mono font-semibold text-indigo-300">{c.code}</td>
                        <td className="py-2 pr-4 text-slate-300">{c.usedCount}</td>
                        <td className="py-2 text-slate-300">{c.redemptions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Analytics
