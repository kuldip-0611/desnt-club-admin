import type { ReactElement, ReactNode } from 'react'

export type DataTableColumn<T> = {
  key: string
  header: ReactNode
  className?: string
  cellClassName?: string
  render: (row: T) => ReactNode
}

type DataTableProps<T> = {
  columns: DataTableColumn<T>[]
  rows: T[]
  emptyText?: string
  rowKey: (row: T) => string
  loading?: boolean
}

const DataTable = <T,>({
  columns,
  rows,
  emptyText = 'No records found.',
  rowKey,
  loading = false,
}: DataTableProps<T>): ReactElement => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
              {columns.map((col) => (
                <th key={col.key} scope="col" className={`whitespace-nowrap px-4 py-4 ${col.className ?? ''}`}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-500">
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={rowKey(row)} className="data-table-row transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-4 ${col.cellClassName ?? ''}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DataTable
