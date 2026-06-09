import type { ReactElement } from 'react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import { deleteSize, listSizes, updateSize } from '../services/sizing'
import type { Size } from '../types/sizing'

const summarizeMeasurements = (s: Size): string => {
  if (!s.measurementValues?.length) return '—'
  return s.measurementValues
    .map((mv) => `${mv.attribute.label}: ${mv.value}${mv.attribute.unit ? ` ${mv.attribute.unit}` : ''}`)
    .join(' · ')
}

const Sizes = (): ReactElement => {
  const queryClient = useQueryClient()
  const [sizeToDelete, setSizeToDelete] = useState<Size | null>(null)
  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ['admin-sizes'],
    queryFn: listSizes,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSize,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sizes'] })
      toast.success('Size deleted')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Delete failed'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ sid, isActive }: { sid: string; isActive: boolean }) =>
      updateSize(sid, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sizes'] })
    },
    onError: (err: Error) => toast.error(err.message ?? 'Update failed'),
  })

  const handleDelete = (s: Size) => {
    setSizeToDelete(s)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-800">
        Could not load sizes.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Sizes</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Master list of size codes (M, L, 32, …). <strong>Sort order</strong> controls listing order (smaller =
            earlier). Optional <strong>chart unit</strong> (cm / in) reminds admins how to enter numbers for that row.
            Add only the measurements that apply — leave others blank (e.g. track pants without chest).
          </p>
        </div>
        <Link
          to="/dashboard/sizes/new"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500"
        >
          + New size
        </Link>
      </div>

      {!rows?.length ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white px-8 py-16 text-center text-sm text-slate-600">
          No sizes yet. Create attributes first, then add sizes with optional measurements.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3" title="Optional hint for how numbers in this row are entered">
                  Unit
                </th>
                <th className="px-4 py-3">Measurements</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-900">{s.code}</td>
                  <td className="px-4 py-3 text-slate-700">{s.name ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs font-medium uppercase text-slate-600">
                    {s.valueUnit === 'cm' || s.valueUnit === 'in' ? s.valueUnit : '—'}
                  </td>
                  <td className="max-w-md px-4 py-3 text-xs leading-snug text-slate-600">
                    {summarizeMeasurements(s)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleMutation.mutate({ sid: s.id, isActive: !s.isActive })}
                      disabled={toggleMutation.isPending}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        s.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {s.isActive ? 'On' : 'Off'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/dashboard/sizes/${s.id}/edit`}
                      className="mr-2 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(s)}
                      className="text-sm font-semibold text-red-600 hover:text-red-500"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDeleteModal
        isOpen={sizeToDelete != null}
        title="Delete size"
        message={sizeToDelete ? `Delete size "${sizeToDelete.code}"?` : ''}
        isLoading={deleteMutation.isPending}
        onClose={() => setSizeToDelete(null)}
        onConfirm={() => {
          if (!sizeToDelete) return
          deleteMutation.mutate(sizeToDelete.id, {
            onSuccess: () => setSizeToDelete(null),
          })
        }}
      />
    </div>
  )
}

export default Sizes
