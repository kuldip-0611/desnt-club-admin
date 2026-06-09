import type { ReactElement } from 'react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import {
  deleteMeasurementAttribute,
  listMeasurementAttributes,
  updateMeasurementAttribute,
} from '../services/sizing'
import type { MeasurementAttribute } from '../types/sizing'

const MeasurementAttributes = (): ReactElement => {
  const queryClient = useQueryClient()
  const [attributeToDelete, setAttributeToDelete] = useState<MeasurementAttribute | null>(null)
  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ['admin-measurement-attributes'],
    queryFn: listMeasurementAttributes,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMeasurementAttribute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-measurement-attributes'] })
      toast.success('Attribute deleted')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Delete failed'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateMeasurementAttribute(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-measurement-attributes'] })
    },
    onError: (err: Error) => toast.error(err.message ?? 'Update failed'),
  })

  const handleDelete = (a: MeasurementAttribute) => {
    setAttributeToDelete(a)
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
        Could not load measurement attributes.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Measurement attributes
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Define reusable fields (chest, length, shoulder, inseam, …). Each size only stores values for the
            attributes that apply — e.g. track pants can omit chest. Use <strong>sort order</strong> so fields list in a
            sensible sequence (smaller = first). Pick <strong>cm</strong> or <strong>in</strong> per field so size charts
            show the right unit.
          </p>
        </div>
        <Link
          to="/dashboard/measurement-attributes/new"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500"
        >
          + New attribute
        </Link>
      </div>

      {!rows?.length ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white px-8 py-16 text-center text-sm text-slate-600">
          No attributes yet. Create <strong>chest</strong>, <strong>length</strong>, <strong>shoulder</strong>, etc.,
          then assign values per size on the Sizes page.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3">Sort</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-900">{a.label}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{a.slug}</td>
                  <td className="px-4 py-3 text-slate-600">{a.unit ?? '—'}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{a.sortOrder}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleMutation.mutate({ id: a.id, isActive: !a.isActive })}
                      disabled={toggleMutation.isPending}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        a.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {a.isActive ? 'On' : 'Off'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/dashboard/measurement-attributes/${a.id}/edit`}
                      className="mr-2 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(a)}
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
        isOpen={attributeToDelete != null}
        title="Delete measurement attribute"
        message={
          attributeToDelete
            ? `Delete "${attributeToDelete.label}"? Sizes that use this field will lose that measurement row.`
            : ''
        }
        isLoading={deleteMutation.isPending}
        onClose={() => setAttributeToDelete(null)}
        onConfirm={() => {
          if (!attributeToDelete) return
          deleteMutation.mutate(attributeToDelete.id, {
            onSuccess: () => setAttributeToDelete(null),
          })
        }}
      />
    </div>
  )
}

export default MeasurementAttributes
