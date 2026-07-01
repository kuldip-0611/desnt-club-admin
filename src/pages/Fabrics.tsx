import { apiErrorMessage } from '../services/api'
import type { ReactElement } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useState } from 'react'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import DataTable, { type DataTableColumn } from '../components/ui/DataTable'
import { deleteFabric, listFabrics, updateFabric } from '../services/fabrics'
import type { Fabric } from '../types/fabric'

const Fabrics = (): ReactElement => {
  const queryClient = useQueryClient()
  const [fabricToDelete, setFabricToDelete] = useState<Fabric | null>(null)
  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ['admin-fabrics'],
    queryFn: listFabrics,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFabric,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-fabrics'] })
      toast.success('Fabric deleted')
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, 'Delete failed')),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateFabric(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-fabrics'] })
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, 'Update failed')),
  })

  const handleDelete = (f: Fabric) => {
    setFabricToDelete(f)
  }

  const columns: DataTableColumn<Fabric>[] = [
    { key: 'name', header: 'Name', render: (f) => <span className="font-medium text-slate-900">{f.name}</span> },
    { key: 'slug', header: 'Slug', render: (f) => <span className="font-mono text-xs text-slate-600">{f.slug}</span> },
    {
      key: 'active',
      header: 'Active',
      render: (f) => (
        <button
          type="button"
          onClick={() => toggleMutation.mutate({ id: f.id, isActive: !f.isActive })}
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
            f.isActive ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
          }`}
        >
          {f.isActive ? 'Active' : 'Inactive'}
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (f) => (
        <>
          <Link to={`/dashboard/fabrics/${f.id}/edit`} className="mr-3 text-sm font-semibold text-indigo-600 hover:text-indigo-500">
            Edit
          </Link>
          <button type="button" onClick={() => handleDelete(f)} className="text-sm font-semibold text-red-600 hover:text-red-500">
            Delete
          </button>
        </>
      ),
    },
  ]

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
        Could not load fabrics.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Fabrics</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Materials such as cotton and polyester. Assign a fabric and composition percentage on each product.
          </p>
        </div>
        <Link
          to="/dashboard/fabrics/new"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500"
        >
          + New fabric
        </Link>
      </div>

      {!rows?.length ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white px-8 py-16 text-center text-sm text-slate-600">
          No fabrics yet. Add <strong>cotton</strong>, <strong>polyester</strong>, etc., then pick them when editing a
          product.
        </div>
      ) : (
        <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />
      )}
      <ConfirmDeleteModal
        isOpen={fabricToDelete != null}
        title="Delete fabric"
        message={
          fabricToDelete
            ? `Delete fabric "${fabricToDelete.name}"? Products using it will lose this link.`
            : ''
        }
        isLoading={deleteMutation.isPending}
        onClose={() => setFabricToDelete(null)}
        onConfirm={() => {
          if (!fabricToDelete) return
          deleteMutation.mutate(fabricToDelete.id, {
            onSuccess: () => setFabricToDelete(null),
          })
        }}
      />
    </div>
  )
}

export default Fabrics
