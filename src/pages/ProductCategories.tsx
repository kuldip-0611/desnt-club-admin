import type { ReactElement } from 'react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import {
  deleteProductCategory,
  listProductCategories,
  updateProductCategory,
} from '../services/productCategories'
import type { ProductCategory } from '../types/productCategory'

const ProductCategories = (): ReactElement => {
  const queryClient = useQueryClient()
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategory | null>(null)
  const { data: rows, isLoading, isError } = useQuery({
    queryKey: ['admin-product-categories'],
    queryFn: listProductCategories,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProductCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-product-categories'] })
      toast.success('Category deleted')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Delete failed'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateProductCategory(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-product-categories'] })
    },
    onError: (err: Error) => toast.error(err.message ?? 'Update failed'),
  })

  const handleDelete = (c: ProductCategory) => {
    setCategoryToDelete(c)
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
        Could not load categories.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Product categories</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Group catalog items (T-shirt, tracks, hoodies, …). Assign a category when adding or editing a product.
            Lower <strong>sort order</strong> values list first.
          </p>
        </div>
        <Link
          to="/dashboard/product-categories/new"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-500"
        >
          + New category
        </Link>
      </div>

      {!rows?.length ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white px-8 py-16 text-center text-sm text-slate-600">
          No categories yet. Create <strong>t-shirt</strong>, <strong>tracks</strong>, etc., then pick them on each
          product.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Sort</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{c.slug}</td>
                  <td className="px-4 py-3 tabular-nums text-slate-700">{c.sortOrder}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleMutation.mutate({ id: c.id, isActive: !c.isActive })}
                      disabled={toggleMutation.isPending}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {c.isActive ? 'On' : 'Off'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/dashboard/product-categories/${c.id}/edit`}
                      className="mr-2 text-sm font-semibold text-indigo-600 hover:text-indigo-500"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(c)}
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
        isOpen={categoryToDelete != null}
        title="Delete category"
        message={
          categoryToDelete
            ? `Delete category "${categoryToDelete.name}"? Products using it will lose this link.`
            : ''
        }
        isLoading={deleteMutation.isPending}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={() => {
          if (!categoryToDelete) return
          deleteMutation.mutate(categoryToDelete.id, {
            onSuccess: () => setCategoryToDelete(null),
          })
        }}
      />
    </div>
  )
}

export default ProductCategories
