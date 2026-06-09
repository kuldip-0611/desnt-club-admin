import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../hooks/useAuth'

const linkBase =
  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150'

const AdminLayout = (): ReactElement => {
  const navigate = useNavigate()
  const location = useLocation()
  const { removeToken } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    queueMicrotask(() => {
      setMobileOpen(false)
    })
  }, [location.pathname])

  const handleLogout = () => {
    removeToken()
    toast.success('Logged out successfully.')
    navigate('/login', { replace: true })
  }

  const isCatalogListOrEdit =
    location.pathname === '/dashboard/products' ||
    location.pathname === '/dashboard/products/new' ||
    /^\/dashboard\/products\/[^/]+\/edit$/.test(location.pathname)

  const isProductCategoriesSection = location.pathname.startsWith('/dashboard/product-categories')

  const isFabricsSection = location.pathname.startsWith('/dashboard/fabrics')

  const isCouponsSection = location.pathname.startsWith('/dashboard/coupons')

  const isSizingSection =
    location.pathname.startsWith('/dashboard/measurement-attributes') ||
    location.pathname.startsWith('/dashboard/sizes')

  const sidebarNav = (
    <>
      <div className="border-b border-slate-700/80 px-4 py-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Desent Club</p>
        <p className="mt-1 text-lg font-bold tracking-tight text-white">Admin</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        <p className="mb-1 px-3 pt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Overview
        </p>
        <NavLink
          to="/dashboard"
          end
          className={({ isActive }) =>
            `${linkBase} ${
              isActive
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-base" aria-hidden>
            ◎
          </span>
          Dashboard
        </NavLink>

        <p className="mb-1 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Products
        </p>
        <NavLink
          to="/dashboard/products"
          className={() =>
            `${linkBase} ${
              isCatalogListOrEdit
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-base" aria-hidden>
            ☰
          </span>
          All products
        </NavLink>
        <NavLink
          to="/dashboard/product-categories"
          className={() =>
            `${linkBase} ${
              isProductCategoriesSection
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-xs font-bold" aria-hidden>
            C
          </span>
          Categories
        </NavLink>
        <NavLink
          to="/dashboard/fabrics"
          className={() =>
            `${linkBase} ${
              isFabricsSection
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-xs font-bold" aria-hidden>
            F
          </span>
          Fabrics
        </NavLink>

        <p className="mb-1 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Sizing
        </p>
        <NavLink
          to="/dashboard/measurement-attributes"
          className={() =>
            `${linkBase} ${
              isSizingSection && location.pathname.startsWith('/dashboard/measurement-attributes')
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-xs font-bold" aria-hidden>
            ⌖
          </span>
          Measurements
        </NavLink>
        <NavLink
          to="/dashboard/sizes"
          className={() =>
            `${linkBase} ${
              isSizingSection && location.pathname.startsWith('/dashboard/sizes')
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-xs font-bold" aria-hidden>
            S
          </span>
          Sizes
        </NavLink>

        <p className="mb-1 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Promotions
        </p>
        <NavLink
          to="/dashboard/coupons"
          className={() =>
            `${linkBase} ${
              isCouponsSection
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-base" aria-hidden>
            %
          </span>
          Coupons
        </NavLink>
      </nav>

      <div className="border-t border-slate-700/80 p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          <span className="text-base" aria-hidden>
            →
          </span>
          Log out
        </button>
      </div>
    </>
  )

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Mobile overlay */}
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      {/* Sidebar — desktop fixed, mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-slate-700/50 bg-slate-900 transition-transform duration-200 ease-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {sidebarNav}
      </aside>

      {/* Main */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm lg:hidden">
          <button
            type="button"
            aria-label="Open menu"
            className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
            onClick={() => setMobileOpen(true)}
          >
            <span className="flex flex-col gap-1" aria-hidden>
              <span className="block h-0.5 w-5 rounded-full bg-current" />
              <span className="block h-0.5 w-5 rounded-full bg-current" />
              <span className="block h-0.5 w-5 rounded-full bg-current" />
            </span>
          </button>
          <span className="font-semibold text-slate-900">Desent Club</span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
