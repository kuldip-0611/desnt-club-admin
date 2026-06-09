import type { ReactElement } from 'react'
import { NavLink } from 'react-router-dom'

const tabClass = ({ isActive }: { isActive: boolean }): string =>
  `rounded-lg px-4 py-2 text-sm font-semibold transition ${
    isActive
      ? 'bg-indigo-600 text-white shadow-md'
      : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
  }`

const AccountsSubNav = (): ReactElement => (
  <nav
    className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2"
    aria-label="Accounts sections"
  >
    <NavLink to="/dashboard/users" className={tabClass}>
      Users & coupons
    </NavLink>
    <NavLink to="/dashboard/user-groups" className={tabClass}>
      User groups
    </NavLink>
  </nav>
)

export default AccountsSubNav
