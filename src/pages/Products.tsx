import type { ReactElement } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useInfiniteQuery, keepPreviousData, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import DataTable, { type DataTableColumn } from '../components/ui/DataTable'
import FilterBar from '../components/ui/FilterBar'
import KpiCard from '../components/ui/KpiCard'
import ListLoader from '../components/ui/ListLoader'
import { useDebounce } from '../hooks/useDebounce'
import {
  deleteProduct,
  listProducts,
  importProductsCsv,
  type PaginatedProductsResponse,
  productImageUrl,
  updateProduct,
} from '../services/products'
import type { Product } from '../types/product'
import { useRef } from 'react'

const downloadCsv = (filename: string, rows: string[][]) => {
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

const parseCsvText = (text: string): string[][] => {
  return text.trim().split('\n').map(line =>
    line.split(',').map(cell => cell.trim().replace(/^"|"$/g, '').replace(/""/g, '"'))
  )
}

const fabricDisplay = (p: Product): string | null => {
  if (p.productFabrics?.length) {
    return p.productFabrics.map((r) => `${r.percent}% ${r.fabric.name}`).join(' · ')
  }
  return p.fabric?.trim() ? p.fabric.trim() : null
}

const LOW_STOCK_THRESHOLD = 5

const Products = (): ReactElement => {
  const queryClient = useQueryClient()
  const csvInputRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search.trim(), 350)
  const pageSize = 20
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const { data, isLoading, isFetching, isError, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: ['admin-products-infinite', pageSize, debouncedSearch],
    queryFn: ({ pageParam = 1 }) =>
      listProducts({
        page: pageParam as number,
        limit: pageSize,
        search: debouncedSearch || undefined,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: PaginatedProductsResponse) =>
      lastPage.hasNextPage ? lastPage.page + 1 : undefined,
    placeholderData: keepPreviousData,
  })

  const products = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data?.pages],
  )
  const stats = data?.pages[0]?.summary ?? { total: 0, available: 0, lowStock: 0 }
  const totalPages = data?.pages[0]?.totalPages ?? 1
  const loadedPages = data?.pages.length ?? 1
  const totalItems = data?.pages[0]?.total ?? 0
  const isInitialLoading = isLoading && products.length === 0
  const isRefreshing = isFetching && !isFetchingNextPage && products.length > 0

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0]
      if (target?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage],
  )

  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '240px',
      threshold: 0.1,
    })
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [handleObserver])

  const columns: DataTableColumn<Product>[] = [
    {
      key: 'image',
      header: 'Image',
      className: 'pl-6',
      cellClassName: 'whitespace-nowrap pl-6',
      render: (p) =>
        p.images[0] ? (
          <img
            src={productImageUrl(p.images[0].path)}
            alt=""
            className="h-14 w-14 rounded-xl border border-slate-200 object-cover shadow-sm"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400">
            No img
          </div>
        ),
    },
    {
      key: 'product',
      header: 'Product',
      cellClassName: 'max-w-xs',
      render: (p) => {
        const fabLabel = fabricDisplay(p)
        return (
          <>
            <p className="font-semibold text-slate-900">{p.name}</p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                {p.audience === 'MEN' ? 'Men' : p.audience === 'WOMEN' ? 'Women' : 'Unisex'}
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
            {p.description ? <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{p.description}</p> : null}
          </>
        )
      },
    },
    {
      key: 'category',
      header: 'Category',
      render: (p) => (
        <span className="text-sm text-slate-700">
          {p.category?.name ?? '—'}
          {p.subcategory?.name ? (
            <span className="mt-0.5 block text-xs text-slate-500">{p.subcategory.name}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      render: (p) =>
        (p.discountPercent ?? 0) >= 1 && p.salePrice != null && p.salePrice < p.price ? (
          <span className="inline-flex flex-col gap-0.5">
            <span className="text-xs font-normal text-slate-400 line-through">₹{p.price.toFixed(2)}</span>
            <span className="font-medium text-emerald-700">₹{p.salePrice.toFixed(2)}</span>
            <span className="text-[10px] font-semibold uppercase text-rose-600">{p.discountPercent}% off</span>
          </span>
        ) : (
          <span className="font-medium tabular-nums text-slate-800">₹{p.price.toFixed(2)}</span>
        ),
    },
    {
      key: 'qty',
      header: 'Qty',
      cellClassName: 'max-w-[140px]',
      render: (p) => (
        <>
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
        </>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
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
          <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${p.isAvailable ? 'bg-emerald-500' : 'bg-slate-500'}`} />
          {p.isAvailable ? 'Available' : 'Unavailable'}
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right pr-6',
      cellClassName: 'text-right pr-6',
      render: (p) => (
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
      ),
    },
  ]

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products-infinite'] })
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      toast.success('Product deleted')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Delete failed'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      updateProduct(id, { isAvailable }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products-infinite'] })
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      toast.success('Availability updated')
    },
    onError: (err: Error) => toast.error(err.message ?? 'Update failed'),
  })

  const importMutation = useMutation({
    mutationFn: importProductsCsv,
    onSuccess: (res) => {
      toast.success(`Imported ${res.imported} products`)
      void queryClient.invalidateQueries({ queryKey: ['admin-products-infinite'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-products'] })
    },
    onError: () => toast.error('Import failed — the backend endpoint may not exist yet.'),
  })

  const handleExportCsv = () => {
    const rows: string[][] = [
      ['id', 'name', 'price', 'quantity', 'category', 'isAvailable'],
      ...products.map(p => [
        p.id,
        p.name,
        String(p.price),
        String(p.quantity),
        p.category?.name ?? '',
        String(p.isAvailable),
      ]),
    ]
    downloadCsv(`products-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string
        const rows = parseCsvText(text)
        const header = rows[0]?.map(h => h.toLowerCase()) ?? []
        const nameIdx = header.indexOf('name')
        const priceIdx = header.indexOf('price')
        const qtyIdx = header.indexOf('quantity')
        if (nameIdx === -1 || priceIdx === -1 || qtyIdx === -1) {
          toast.error('CSV must have columns: name, price, quantity')
          return
        }
        const importRows = rows.slice(1).map(row => ({
          name: row[nameIdx] ?? '',
          price: parseFloat(row[priceIdx] ?? '0') || 0,
          quantity: parseInt(row[qtyIdx] ?? '0', 10) || 0,
        })).filter(r => r.name)
        if (importRows.length === 0) { toast.error('No valid rows found'); return }
        const ok = window.confirm(`Import ${importRows.length} products?`)
        if (ok) importMutation.mutate(importRows)
      } catch {
        toast.error('Failed to parse CSV')
      }
    }
    reader.readAsText(file)
    // Reset input
    e.target.value = ''
  }

  const handleDelete = (product: Product) => {
    setProductToDelete(product)
  }

  const handleToggle = (product: Product) => {
    toggleMutation.mutate({ id: product.id, isAvailable: !product.isAvailable })
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
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={products.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            ↓ Export CSV
          </button>
          <button
            type="button"
            onClick={() => csvInputRef.current?.click()}
            disabled={importMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            ↑ Import CSV
          </button>
          <input ref={csvInputRef} type="file" accept=".csv,text/csv" onChange={handleImportFile} className="hidden" />
          <Link
            to="/dashboard/products/new"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-900/20 transition hover:bg-indigo-500"
          >
            + Add product
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Total SKUs" value={stats.total} />
        <KpiCard label="Available" value={stats.available} tone="success" />
        <KpiCard label={`Low stock (≤${LOW_STOCK_THRESHOLD})`} value={stats.lowStock} tone="warning" />
      </div>

      {/* Search */}
      <FilterBar
        searchId="product-search"
        searchPlaceholder="Search by product name…"
        searchValue={search}
        onSearchChange={setSearch}
      />

      {/* Table */}
      {isInitialLoading ? (
        <ListLoader label="Loading products…" />
      ) : !products.length ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white px-8 py-16 text-center">
          <p className="text-lg font-medium text-slate-700">
            {debouncedSearch ? `No products match "${debouncedSearch}".` : 'No products yet'}
          </p>
          {!debouncedSearch ? (
            <>
              <p className="mt-2 text-sm text-slate-500">Create your first product to see it in this table.</p>
              <Link
                to="/dashboard/products/new"
                className="mt-6 inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Add product
              </Link>
            </>
          ) : null}
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={products}
          rowKey={(row) => row.id}
          loading={isRefreshing}
          emptyText={debouncedSearch ? `No products match "${debouncedSearch}".` : 'No products yet.'}
        />
      )}
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
        <span className="text-slate-600">
          Loaded {loadedPages} / {totalPages} pages · {products.length} / {totalItems} products
        </span>
        <span className="text-xs font-medium text-slate-500">
          {hasNextPage ? 'Scroll to load more' : 'All products loaded'}
        </span>
      </div>
      <div ref={sentinelRef} className="flex h-12 items-center justify-center text-xs text-slate-500">
        {isFetchingNextPage ? 'Loading more products...' : hasNextPage ? 'Keep scrolling...' : 'No more products'}
      </div>
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
