import type { ReactElement } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listProducts } from '../services/products'

const Dashboard = (): ReactElement => {
  const { data: products } = useQuery({
    queryKey: ['admin-products'],
    queryFn: listProducts,
  })

  const total = products?.length ?? 0
  const available = products?.filter((p) => p.isAvailable).length ?? 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Dashboard</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Products</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{total}</p>
          <Link
            to="/dashboard/products"
            className="mt-4 inline-flex text-sm font-semibold text-indigo-600 hover:text-indigo-500"
          >
            View catalog →
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Listed as available</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-600">{available}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:col-span-2 lg:col-span-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quick actions</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/dashboard/products/new"
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Add product
            </Link>
            <Link
              to="/dashboard/products"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Manage products
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
