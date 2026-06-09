import type { ReactElement } from 'react'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import {
  deleteProduct,
  listProducts,
  productImageUrl,
  updateProduct,
} from '../services/products'
import type { Product } from '../types/product'

const fabricDisplay = (p: Product): string | null => {
  if (p.productFabrics?.length) {
    return p.productFabrics.map((r) => `${r.percent}% ${r.fabric.name}`).join(' · ')
  }
  return p.fabric?.trim() ? p.fabric.trim() : null
}

const LOW_STOCK_THRESHOLD = 5

const Products = (): ReactElement => {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)

  const { data: products, isLoading, isError } = useQuery({
    queryKey: ['admin-products'],
    queryFn: listProducts,
  })

  const stats = useMemo(() => {
    const list = products ?? []
    return {
      total: list.length,
      available: list.filter((p) => p.isAvailable).length,
      lowStock: list.filter((p) => p.quantity <= LOW_STOCK_THRESHOLD).length,
    }
  }, [products])

  const filteredProducts = useMemo(() => {
    if (!products?.length) return []
    const q = search.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => p.name.toLowerCase().includes(q))
  }, [products, search])

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      toast.success('Product deleted')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Delete failed'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      updateProduct(id, { isAvailable }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      toast.success('Availability updated')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Update failed'),
  })

  const handleDelete = (product: Product) => {
    setProductToDelete(product)
  }

  const handleToggle = (product: Product) => {
    toggleMutation.mutate({ id: product.id, isAvailable: !product.isAvailable })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-sm font-medium">Loading products…</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm text-red-800">
        Could not load products. Check that the API is running and you are logged in as admin.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Products</h1>
          <p className="mt-1 text-sm text-slate-600">
            Inventory, availability, and images. Use the sidebar to add products or edit here.
          </p>
        </div>
        <Link
          to="/dashboard/products/new"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-900/20 transition hover:bg-indigo-500"
        >
          + Add product
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total SKUs</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Available</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-600">{stats.available}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Low stock (≤{LOW_STOCK_THRESHOLD})
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-amber-600">{stats.lowStock}</p>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label htmlFor="product-search" className="sr-only">
          Search products
        </label>
        <input
          id="product-search"
          type="search"
          placeholder="Search by product name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* Table */}
      {!products?.length ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white px-8 py-16 text-center">
          <p className="text-lg font-medium text-slate-700">No products yet</p>
          <p className="mt-2 text-sm text-slate-500">Create your first product to see it in this table.</p>
          <Link
            to="/dashboard/products/new"
            className="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Add product
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                  <th scope="col" className="whitespace-nowrap px-4 py-4 pl-6">
                    Image
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-4">
                    Product
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-4">
                    Category
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-4">
                    Price
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-4">
                    Qty
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-4">
                    Status
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-4 text-right pr-6">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      No products match “{search}”.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const fabLabel = fabricDisplay(p)
                    return (
                    <tr key={p.id} className="transition hover:bg-slate-50/90">
                      <td className="whitespace-nowrap px-4 py-4 pl-6">
                        {p.images[0] ? (
                          <img
                            src={productImageUrl(p.images[0].path)}
                            alt=""
                            className="h-14 w-14 rounded-xl border border-slate-200 object-cover shadow-sm"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400">
                            No img
                          </div>
                        )}
                      </td>
                      <td className="max-w-xs px-4 py-4">
                        <p className="font-semibold text-slate-900">{p.name}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                            {p.audience === 'MEN'
                              ? 'Men'
                              : p.audience === 'WOMEN'
                                ? 'Women'
                                : 'Unisex'}
                          </span>
                          {p.color ? (
                            <span className="inline-flex items-center gap-1.5">
                              {/^#[0-9A-Fa-f]{6}$/i.test(p.color.trim()) ? (
                                <span
                                  className="h-3.5 w-3.5 shrink-0 rounded border border-slate-300 shadow-inner"
                                  style={{ backgroundColor: p.color.trim() }}
                                  title={p.color.trim()}
                                />
                              ) : null}
                              <span className="text-xs font-medium text-slate-600">{p.color}</span>
                            </span>
                          ) : null}
                          {fabLabel ? (
                            <span className="line-clamp-1 text-xs text-slate-500" title={fabLabel}>
                              {fabLabel}
                            </span>
                          ) : null}
                        </p>
                        {p.description ? (
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{p.description}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-slate-400">
                          Updated {new Date(p.updatedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                        {p.category?.name ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-medium tabular-nums text-slate-800">
                        {(p.discountPercent ?? 0) >= 1 && p.salePrice != null && p.salePrice < p.price ? (
                          <span className="inline-flex flex-col gap-0.5">
                            <span className="text-xs font-normal text-slate-400 line-through">
                              ${p.price.toFixed(2)}
                            </span>
                            <span className="text-emerald-700">${p.salePrice.toFixed(2)}</span>
                            <span className="text-[10px] font-semibold uppercase text-rose-600">
                              {p.discountPercent}% off
                            </span>
                          </span>
                        ) : (
                          `$${p.price.toFixed(2)}`
                        )}
                      </td>
                      <td className="max-w-[140px] px-4 py-4">
                        <span
                          className={`inline-flex tabular-nums font-medium ${
                            p.quantity <= LOW_STOCK_THRESHOLD ? 'text-amber-700' : 'text-slate-800'
                          }`}
                        >
                          {p.quantity}
                          {p.quantity <= LOW_STOCK_THRESHOLD ? (
                            <span className="ml-1.5 text-xs font-normal text-amber-600">low</span>
                          ) : null}
                        </span>
                        {p.variants?.length ? (
                          <span className="mt-1 block text-[10px] leading-snug text-slate-500">
                            {p.variants
                              .slice()
                              .sort((a, b) => a.size.localeCompare(b.size, undefined, { sensitivity: 'base' }))
                              .map((v) => `${v.size}: ${v.quantity}`)
                              .join(' · ')}
                          </span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <button
                          type="button"
                          onClick={() => handleToggle(p)}
                          disabled={toggleMutation.isPending}
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                            p.isAvailable
                              ? 'bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-600/20 hover:bg-emerald-200'
                              : 'bg-slate-200 text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-300'
                          }`}
                        >
                          <span
                            className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                              p.isAvailable ? 'bg-emerald-500' : 'bg-slate-500'
                            }`}
                          />
                          {p.isAvailable ? 'Available' : 'Unavailable'}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right pr-6">
                        <div className="flex justify-end gap-2">
                          <Link
                            to={`/dashboard/products/${p.id}/edit`}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(p)}
                            disabled={deleteMutation.isPending}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <ConfirmDeleteModal
        isOpen={productToDelete != null}
        title="Delete product"
        message={
          productToDelete
            ? `Delete "${productToDelete.name}"? This action cannot be undone.`
            : ''
        }
        isLoading={deleteMutation.isPending}
        onClose={() => setProductToDelete(null)}
        onConfirm={() => {
          if (!productToDelete) return
          deleteMutation.mutate(productToDelete.id, {
            onSuccess: () => setProductToDelete(null),
          })
        }}
      />
    </div>
  )
}

export default Products
