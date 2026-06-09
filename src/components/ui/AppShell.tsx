import type { ReactElement, ReactNode } from 'react'
import { Menu, X } from 'lucide-react'

type AppShellProps = {
  sidebar: ReactNode
  mobileHeaderTitle: string
  mobileOpen: boolean
  onMobileOpen: () => void
  onMobileClose: () => void
  children: ReactNode
}

const AppShell = ({
  sidebar,
  mobileHeaderTitle,
  mobileOpen,
  onMobileOpen,
  onMobileClose,
  children,
}: AppShellProps): ReactElement => {
  return (
    <div className="admin-theme flex min-h-screen bg-[#090b10]">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-white/10 bg-[#0d1117] transition-transform duration-200 ease-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {sidebar}
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-[#0d1117]/80 px-4 py-3 backdrop-blur-md shadow-sm lg:hidden">
          <button
            type="button"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            className="rounded-lg border border-white/15 p-1.5 text-slate-300 hover:bg-white/10 transition-colors"
            onClick={mobileOpen ? onMobileClose : onMobileOpen}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="font-semibold text-slate-100">{mobileHeaderTitle}</span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}

export default AppShell
