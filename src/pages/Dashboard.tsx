import type { ReactElement } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Package,
  CheckCircle,
  AlertTriangle,
  Users,
  Layers,
  TicketPercent,
  Plus,
  ArrowRight,
  ClipboardList,
  TrendingUp,
  ShoppingCart,
} from 'lucide-react'
import DataTable, { type DataTableColumn } from '../components/ui/DataTable'
import { getDashboardOverview, type DashboardRecentProduct } from '../services/dashboard'
import { productImageUrl } from '../services/products'

type StatCard = {
  label: string
  value: number | undefined
  icon: ReactElement
  tone: 'default' | 'success' | 'warning' | 'info'
  link?: string
}

const toneStyles = {
  default: { bg: 'bg-slate-700/40', icon: 'text-slate-400', value: 'text-white' },
  success: { bg: 'bg-emerald-500/10', icon: 'text-emerald-400', value: 'text-emerald-300' },
  warning: { bg: 'bg-amber-500/10', icon: 'text-amber-400', value: 'text-amber-300' },
  info: { bg: 'bg-indigo-500/10', icon: 'text-indigo-400', value: 'text-indigo-300' },
}

const Dashboard = (): ReactElement => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard-overview'],
    queryFn: getDashboardOverview,
  })

  const cards = data?.cards
  const recent = data?.recentProducts ?? []

  const stats: StatCard[] = [
    { label: 'Total Products', value: cards?.products, icon: <Package size={20} />, tone: 'default', link: '/dashboard/products' },
    { label: 'Available', value: cards?.availableProducts, icon: <CheckCircle size={20} />, tone: 'success' },
    { label: 'Low Stock', value: cards?.lowStockProducts, icon: <AlertTriangle size={20} />, tone: 'warning' },
    { label: 'Total Users', value: cards?.users, icon: <Users size={20} />, tone: 'info', link: '/dashboard/users' },
    { label: 'Categories', value: cards?.categories, icon: <Layers size={20} />, tone: 'default', link: '/dashboard/product-categories' },
    { label: 'Active Coupons', value: cards?.activeCoupons, icon: <TicketPercent size={20} />, tone: 'info', link: '/dashboard/coupons' },
    { label: 'Total Orders', value: cards?.totalOrders, icon: <ClipboardList size={20} />, tone: 'default', link: '/dashboard/orders' },
    { label: 'Pending Orders', value: cards?.pendingOrders, icon: <ShoppingCart size={20} />, tone: 'warning', link: '/dashboard/orders' },
    { label: 'Pending Returns', value: cards?.pendingReturns, icon: <ClipboardList size={20} />, tone: 'warning', link: '/dashboard/returns' },
  ]

  const columns: DataTableColumn<DashboardRecentProduct>[] = [
    {
      key: 'image',
      header: 'Image',
      render: (p) =>
        p.image ? (
          <img src={productImageUrl(p.image)} alt="" className="h-12 w-12 rounded-xl border border-white/10 object-cover" />
        ) : (
          <div className="h-12 w-12 rounded-xl border border-dashed border-white/15 bg-white/5" />
        ),
    },
    {
      key: 'name',
      header: 'Product',
      render: (p) => <span className="font-semibold text-slate-100">{p.name}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      render: (p) => <span className="text-slate-400">{p.category?.name ?? '—'}</span>,
    },
    {
      key: 'price',
      header: 'Price',
      render: (p) => <span className="font-medium text-slate-200">₹{p.price.toFixed(2)}</span>,
    },
    {
      key: 'qty',
      header: 'Qty',
      render: (p) => <span className="tabular-nums text-slate-300">{p.quantity}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
          p.isAvailable
            ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
            : 'bg-slate-500/10 text-slate-400 ring-1 ring-slate-500/20'
        }`}>
          {p.isAvailable ? 'Available' : 'Unavailable'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">Welcome back — here's what's happening.</p>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-indigo-400" />
          <span className="text-sm text-slate-400">Live overview</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const styles = toneStyles[stat.tone]
          const inner = (
            <div className={`rounded-2xl border border-white/10 p-5 transition-all ${styles.bg} ${stat.link ? 'hover:border-white/20 cursor-pointer' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{stat.label}</p>
                  <p className={`mt-2 text-3xl font-bold tabular-nums ${styles.value}`}>
                    {isLoading ? '—' : (stat.value ?? 0)}
                  </p>
                </div>
                <span className={`mt-1 ${styles.icon}`}>{stat.icon}</span>
              </div>
              {stat.link && (
                <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${styles.icon}`}>
                  View all <ArrowRight size={11} />
                </div>
              )}
            </div>
          )
          return stat.link ? (
            <Link key={stat.label} to={stat.link}>{inner}</Link>
          ) : (
            <div key={stat.label}>{inner}</div>
          )
        })}
      </div>

      {/* Quick actions */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Quick Actions</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to="/dashboard/products/new"
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 hover:bg-indigo-500 transition-colors"
          >
            <Plus size={15} /> Add Product
          </Link>
          <Link
            to="/dashboard/orders"
            className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10 transition-colors"
          >
            <ClipboardList size={15} /> View Orders
          </Link>
          <Link
            to="/dashboard/coupons/new"
            className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10 transition-colors"
          >
            <TicketPercent size={15} /> Create Coupon
          </Link>
        </div>
      </div>

      {/* Recent products table */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Recently Updated Products
            {isLoading && <span className="ml-2 text-sm font-normal text-slate-500">(loading…)</span>}
          </h2>
          <Link to="/dashboard/products" className="flex items-center gap-1 text-sm font-medium text-indigo-400 hover:text-indigo-300">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <DataTable columns={columns} rows={recent} rowKey={(row) => row.id} emptyText="No products yet." />
      </div>
    </div>
  )
}

export default Dashboard
