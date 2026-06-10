import type { ReactElement } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Home, ArrowLeft, Search, LayoutDashboard } from 'lucide-react'

const NotFound = (): ReactElement => {
  const navigate = useNavigate()

  return (
    <div className="admin-theme flex min-h-screen items-center justify-center bg-[#090b10] px-4">
      {/* Background glow effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute -right-40 bottom-1/4 h-96 w-96 rounded-full bg-violet-600/8 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg text-center">
        {/* 404 number */}
        <div className="relative mb-2 select-none">
          <span className="bg-gradient-to-b from-white/10 to-transparent bg-clip-text text-[160px] font-black leading-none tracking-tighter text-transparent sm:text-[200px]">
            404
          </span>
          {/* Overlay label */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-2xl border border-white/10 bg-indigo-600/20 px-4 py-2 backdrop-blur-sm">
              <span className="text-sm font-bold uppercase tracking-widest text-indigo-300">
                Page not found
              </span>
            </div>
          </div>
        </div>

        {/* Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          <Search size={28} className="text-slate-400" />
        </div>

        {/* Message */}
        <h1 className="mb-3 text-2xl font-bold text-white sm:text-3xl">
          Oops! Lost in the dashboard
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-slate-400">
          The admin page you're looking for doesn't exist or has been moved.
          <br className="hidden sm:block" />
          Let's get you back on track.
        </p>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/dashboard"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition-colors hover:bg-indigo-500 sm:w-auto"
          >
            <LayoutDashboard size={16} />
            Go to Dashboard
          </Link>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 sm:w-auto"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        </div>

        {/* Quick links */}
        <div className="mt-10 border-t border-white/10 pt-8">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-500">
            Quick links
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { to: '/dashboard/products', label: 'Products' },
              { to: '/dashboard/orders', label: 'Orders' },
              { to: '/dashboard/users', label: 'Users' },
              { to: '/dashboard/coupons', label: 'Coupons' },
              { to: '/dashboard/analytics', label: 'Analytics' },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFound
