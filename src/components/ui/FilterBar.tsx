import type { ReactElement, ReactNode } from 'react'

type FilterBarProps = {
  searchId?: string
  searchPlaceholder?: string
  searchValue: string
  onSearchChange: (value: string) => void
  children?: ReactNode
}

const FilterBar = ({
  searchId = 'filter-search',
  searchPlaceholder = 'Search...',
  searchValue,
  onSearchChange,
  children,
}: FilterBarProps): ReactElement => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3">
        <label htmlFor={searchId} className="sr-only">
          Search
        </label>
        <input
          id={searchId}
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
        {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
      </div>
    </div>
  )
}

export default FilterBar
