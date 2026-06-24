import type { ReactElement } from 'react'

type ListLoaderProps = {
  label?: string
  className?: string
  minHeightClassName?: string
}

const ListLoader = ({
  label = 'Loading…',
  className = 'rounded-2xl border border-slate-200 bg-white',
  minHeightClassName = 'min-h-[280px]',
}: ListLoaderProps): ReactElement => (
  <div className={`flex items-center justify-center ${minHeightClassName} ${className}`}>
    <div className="flex flex-col items-center gap-3 text-slate-500">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  </div>
)

export default ListLoader
