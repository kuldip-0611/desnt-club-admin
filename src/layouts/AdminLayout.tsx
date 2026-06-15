import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import {
  LayoutDashboard,
  Package,
  Tag,
  Scissors,
  Ruler,
  TicketPercent,
  Users,
  UsersRound,
  LogOut,
  ShoppingBag,
  ChevronRight,
  Layers,
  ClipboardList,
  RotateCcw,
  BarChart2,
  Archive,
  Image,
  Zap,
  Bell,
  Package2,
  Star,
} from 'lucide-react'
import AppShell from '../components/ui/AppShell'
import { useAuth } from '../hooks/useAuth'

type NavItem = {
  to: string
  label: string
  icon: ReactElement
  exact?: boolean
  matchPrefix?: string
}

type NavSection = {
  title: string
  items: NavItem[]
}

const AdminLayout = (): ReactElement => {
  const navigate = useNavigate()
  const location = useLocation()
  const { removeToken } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    queueMicrotask(() => setMobileOpen(false))
  }, [location.pathname])

  const handleLogout = () => {
    removeToken()
    toast.success('Logged out successfully.')
    navigate('/login', { replace: true })
  }

  const checkActive = (item: NavItem): boolean => {
    if (item.exact) return location.pathname === item.to
    if (item.matchPrefix) return location.pathname.startsWith(item.matchPrefix)
    return location.pathname === item.to || location.pathname.startsWith(item.to + '/')
  }

  const navSections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, exact: true },
        { to: '/dashboard/analytics', label: 'Analytics', icon: <BarChart2 size={18} />, matchPrefix: '/dashboard/analytics' },
      ],
    },
    {
      title: 'Catalog',
      items: [
        { to: '/dashboard/products', label: 'Products', icon: <Package size={18} />, matchPrefix: '/dashboard/products' },
        { to: '/dashboard/inventory', label: 'Inventory', icon: <Archive size={18} />, matchPrefix: '/dashboard/inventory' },
        { to: '/dashboard/product-categories', label: 'Categories', icon: <Layers size={18} />, matchPrefix: '/dashboard/product-categories' },
        { to: '/dashboard/fabrics', label: 'Fabrics', icon: <Scissors size={18} />, matchPrefix: '/dashboard/fabrics' },
      ],
    },
    {
      title: 'Sizing',
      items: [
        { to: '/dashboard/measurement-attributes', label: 'Measurements', icon: <Ruler size={18} />, matchPrefix: '/dashboard/measurement-attributes' },
        { to: '/dashboard/sizes', label: 'Sizes', icon: <Tag size={18} />, matchPrefix: '/dashboard/sizes' },
      ],
    },
    {
      title: 'Orders',
      items: [
        { to: '/dashboard/orders', label: 'All Orders', icon: <ClipboardList size={18} />, matchPrefix: '/dashboard/orders' },
        { to: '/dashboard/returns', label: 'Returns', icon: <RotateCcw size={18} />, matchPrefix: '/dashboard/returns' },
      ],
    },
    {
      title: 'Promotions',
      items: [
        { to: '/dashboard/coupons', label: 'Coupons', icon: <TicketPercent size={18} />, matchPrefix: '/dashboard/coupons' },
        { to: '/dashboard/flash-sales', label: 'Flash Sales', icon: <Zap size={18} />, matchPrefix: '/dashboard/flash-sales' },
        { to: '/dashboard/bundles', label: 'Bundles', icon: <Package2 size={18} />, matchPrefix: '/dashboard/bundles' },
        { to: '/dashboard/loyalty', label: 'Loyalty', icon: <Star size={18} />, matchPrefix: '/dashboard/loyalty' },
      ],
    },
    {
      title: 'Marketing',
      items: [
        { to: '/dashboard/banners', label: 'Banners', icon: <Image size={18} />, matchPrefix: '/dashboard/banners' },
        { to: '/dashboard/broadcasts', label: 'Broadcasts', icon: <Bell size={18} />, matchPrefix: '/dashboard/broadcasts' },
      ],
    },
    {
      title: 'Accounts',
      items: [
        { to: '/dashboard/users', label: 'Users', icon: <Users size={18} />, matchPrefix: '/dashboard/users' },
        { to: '/dashboard/user-groups', label: 'User Groups', icon: <UsersRound size={18} />, matchPrefix: '/dashboard/user-groups' },
      ],
    },
  ]

  const sidebarNav = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-900/50">
          <ShoppingBag size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight text-white">Disent Clung</p>
          <p className="text-[10px] font-medium uppercase tracking-widest text-indigo-400">Admin Panel</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section.title} className="mb-5">
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = checkActive(item)
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.exact}
                    className={() =>
                      `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                        active
                          ? 'bg-indigo-600/20 text-indigo-300 ring-1 ring-indigo-500/30'
                          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }`
                    }
                  >
                    <span className={`shrink-0 transition-colors ${active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                      {item.icon}
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {active && <ChevronRight size={13} className="text-indigo-500 opacity-70" />}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-all hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut size={16} />
          <span>Log out</span>
        </button>
      </div>
    </div>
  )

  return (
    <AppShell
      sidebar={sidebarNav}
      mobileHeaderTitle="Disent Clung"
      mobileOpen={mobileOpen}
      onMobileOpen={() => setMobileOpen(true)}
      onMobileClose={() => setMobileOpen(false)}
    >
      <Outlet />
    </AppShell>
  )
}

export default AdminLayout
