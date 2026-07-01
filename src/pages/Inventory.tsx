import type { ReactElement, ChangeEvent } from 'react'
import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { AlertTriangle, Package, ChevronDown, ChevronRight, Search, X, Pencil } from 'lucide-react'
import { listProducts, updateProductStock, updateProductVariants } from '../services/products'
import { useDebounce } from '../hooks/useDebounce'
import type { Product, ProductVariant } from '../types/product'

const LOW_STOCK = 5
const PAGE_SIZE = 20

type StockFilter = 'ALL' | 'OUT_OF_STOCK' | 'LOW_STOCK' | 'IN_STOCK'

const stockFilterLabel: Record<StockFilter, string> = {
  ALL: 'All products',
  OUT_OF_STOCK: 'Out of stock',
  LOW_STOCK: 'Low stock',
  IN_STOCK: 'In stock',
}

/** Debounced stock update per product */
const useDebounceRef = () => {
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  return useCallback((key: string, fn: () => void, delay = 700) => {
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(fn, delay)
  }, [])
}

const VariantQtyInput = ({
  variant,
  productId,
  allVariants,
  onSaved,
}: {
  variant: ProductVariant
  productId: string
  allVariants: ProductVariant[]
  onSaved: () => void
}) => {
  const [val, setVal] = useState(String(variant.quantity))
  const debounce = useDebounceRef()

  const save = (n: number) => {
    const updated = allVariants.map((v) =>
      v.id === variant.id ? { ...v, quantity: n } : v
    )
    debounce(`${productId}-${variant.id}`, () =>
      updateProductVariants(productId, updated).then(onSaved).catch(() => toast.error('Failed to update variant stock'))
    )
  }

  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-xs">
      <div className="flex items-center gap-1 text-slate-300">
        <span className="font-semibold">{variant.size}</span>
        {variant.color && <span className="text-slate-500">· {variant.color}</span>}
      </div>
      <input
        type="number"
        min={0}
        value={val}
        onChange={(e) => {
          setVal(e.target.value)
          const n = parseInt(e.target.value, 10)
          if (!isNaN(n) && n >= 0) save(n)
        }}
        className={`w-16 rounded border px-1.5 py-0.5 text-center text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
          variant.quantity === 0 ? 'border-red-500/40 bg-red-500/10 text-red-300'
          : variant.quantity <= LOW_STOCK ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
          : 'border-white/10 bg-slate-900 text-slate-200'
        }`}
      />
    </div>
  )
}

const StockRow = ({
  product,
  onUpdate,
  isPending,
  onRefresh,
}: {
  product: Product
  onUpdate: (id: string, qty: number) => void
  isPending: boolean
  onRefresh: () => void
}): ReactElement => {
  const [qty, setQty] = useState(String(product.quantity))
  const [expanded, setExpanded] = useState(false)
  const debounce = useDebounceRef()
  const hasVariants = (product.variants?.length ?? 0) > 0

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQty(val)
    const n = parseInt(val, 10)
    if (!isNaN(n) && n >= 0) {
      debounce(product.id, () => onUpdate(product.id, n))
    }
  }

  return (
    <>
      <tr className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-2 text-left"
          >
            {hasVariants ? (
              expanded
                ? <ChevronDown size={14} className="text-slate-500 shrink-0" />
                : <ChevronRight size={14} className="text-slate-500 shrink-0" />
            ) : <span className="w-[14px] shrink-0" />}
            <div>
              <p className="text-sm font-medium text-slate-200 leading-tight">{product.name}</p>
              {hasVariants ? (
                <p className="text-[10px] text-slate-500 mt-0.5">{product.variants!.length} variant{product.variants!.length !== 1 ? 's' : ''} — click to edit</p>
              ) : null}
            </div>
          </button>
        </td>
        <td className="px-4 py-3 text-xs text-slate-400">{product.category?.name ?? '—'}</td>
        <td className="px-4 py-3">
          {hasVariants ? (
            <span className="text-sm font-semibold text-slate-400">{product.quantity}</span>
          ) : (
            <input
              type="number"
              min={0}
              value={qty}
              onChange={handleChange}
              disabled={isPending}
              className={`w-20 rounded-lg border px-2 py-1 text-center text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 ${
                product.quantity === 0
                  ? 'border-red-500/40 bg-red-500/10 text-red-300'
                  : product.quantity <= LOW_STOCK
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                  : 'border-white/10 bg-slate-900 text-slate-200'
              }`}
            />
          )}
        </td>
        <td className="px-4 py-3">
          {product.quantity === 0 ? (
            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400 ring-1 ring-red-500/20">Out of stock</span>
          ) : product.quantity <= LOW_STOCK ? (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400 ring-1 ring-amber-500/20">Low stock</span>
          ) : (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400 ring-1 ring-emerald-500/20">In stock</span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {hasVariants ? (
              <button
                type="button"
                onClick={() => {
                  const zeroed = product.variants!.map((v) => ({ ...v, quantity: 0 }))
                  updateProductVariants(product.id, zeroed)
                    .then(onRefresh)
                    .catch(() => toast.error('Failed to zero variants'))
                }}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-colors"
              >
                Zero all
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const val = window.prompt(`Set stock for "${product.name}":`, String(product.quantity))
                  const n = parseInt(val ?? '', 10)
                  if (!isNaN(n) && n >= 0) { onUpdate(product.id, n); setQty(String(n)) }
                }}
                className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition-colors"
              >
                + Set
              </button>
            )}
            <Link
              to={`/dashboard/products/${product.id}/edit`}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-700/40 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
            >
              <Pencil size={10} /> Edit
            </Link>
          </div>
        </td>
      </tr>
      {expanded && hasVariants ? (
        <tr className="border-b border-white/5 bg-slate-800/30">
          <td colSpan={5} className="px-8 py-3">
            <div className="flex flex-wrap gap-2">
              {product.variants!
                .slice()
                .sort((a, b) => a.size.localeCompare(b.size, undefined, { sensitivity: 'base' }))
                .map((v) => (
                  <VariantQtyInput
                    key={v.id}
                    variant={v}
                    productId={product.id}
                    allVariants={product.variants!}
                    onSaved={onRefresh}
                  />
                ))}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  )
}

const Inventory = (): ReactElement => {
  const queryClient = useQueryClient()

  // ── Filters & pagination ──────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search.trim(), 350)
  const [stockFilter, setStockFilter] = useState<StockFilter>('ALL')
  const [page, setPage] = useState(1)

  // Reset to page 1 when filters change
  const handleSearch = (val: string) => {
    setSearch(val)
    setPage(1)
  }
  const handleStockFilter = (val: StockFilter) => {
    setStockFilter(val)
    setPage(1)
  }

  // ── Main paginated query ─────────────────────────────────────────────────
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-inventory', page, debouncedSearch, stockFilter],
    queryFn: () =>
      listProducts({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        stockStatus: stockFilter !== 'ALL' ? stockFilter : undefined,
      }),
    placeholderData: keepPreviousData,
  })

  // ── Alert stats query (page-1 always, for the alert cards) ───────────────
  const { data: alertData } = useQuery({
    queryKey: ['admin-inventory-alerts'],
    queryFn: () => listProducts({ page: 1, limit: 100 }),
    staleTime: 30_000,
  })

  // ── Mutation ─────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      updateProductStock(id, quantity),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-inventory'] })
      void queryClient.invalidateQueries({ queryKey: ['admin-inventory-alerts'] })
      toast.success('Stock updated')
    },
    onError: () => toast.error('Failed to update stock'),
  })

  const handleUpdate = (id: string, qty: number) => {
    updateMutation.mutate({ id, quantity: qty })
  }

  const allProducts: Product[] = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1
  const isInitialLoading = isLoading && allProducts.length === 0
  const isRefreshing = isFetching && allProducts.length > 0

  const alertProducts: Product[] = alertData?.items ?? []
  const hasLowVariant = (p: Product) =>
    p.variants && p.variants.length > 0
      ? p.variants.some((v) => v.quantity > 0 && v.quantity <= LOW_STOCK)
      : p.quantity > 0 && p.quantity <= LOW_STOCK
  const hasOutOfVariant = (p: Product) =>
    p.variants && p.variants.length > 0
      ? p.variants.every((v) => v.quantity === 0)
      : p.quantity === 0
  const lowStockAlerts = alertProducts.filter((p) => !hasOutOfVariant(p) && hasLowVariant(p))
  const outOfStockAlerts = alertProducts.filter((p) => hasOutOfVariant(p))

  // Stats from alert data (full first page, good enough for stats)
  const inStockCount = alertData?.total ? alertData.total - outOfStockAlerts.length - lowStockAlerts.length : 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Inventory</h1>
        <p className="mt-1 text-sm text-slate-400">Monitor and update stock levels. Changes save automatically.</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => handleStockFilter('OUT_OF_STOCK')}
          className={`rounded-2xl border p-5 text-left transition-all ${stockFilter === 'OUT_OF_STOCK' ? 'border-red-400/50 bg-red-500/20 ring-1 ring-red-500/30' : 'border-red-500/20 bg-red-500/10 hover:bg-red-500/15'}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-red-400">Out of Stock</p>
          <p className="mt-2 text-3xl font-black text-white">{outOfStockAlerts.length}</p>
          <p className="mt-1 text-[10px] text-red-400/60">Click to filter</p>
        </button>
        <button
          type="button"
          onClick={() => handleStockFilter('LOW_STOCK')}
          className={`rounded-2xl border p-5 text-left transition-all ${stockFilter === 'LOW_STOCK' ? 'border-amber-400/50 bg-amber-500/20 ring-1 ring-amber-500/30' : 'border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/15'}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">Low Stock (≤{LOW_STOCK})</p>
          <p className="mt-2 text-3xl font-black text-white">{lowStockAlerts.length}</p>
          <p className="mt-1 text-[10px] text-amber-400/60">Click to filter</p>
        </button>
        <button
          type="button"
          onClick={() => handleStockFilter('IN_STOCK')}
          className={`rounded-2xl border p-5 text-left transition-all ${stockFilter === 'IN_STOCK' ? 'border-emerald-400/50 bg-emerald-500/20 ring-1 ring-emerald-500/30' : 'border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/15'}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">In Stock</p>
          <p className="mt-2 text-3xl font-black text-white">{inStockCount > 0 ? inStockCount : '—'}</p>
          <p className="mt-1 text-[10px] text-emerald-400/60">Click to filter</p>
        </button>
      </div>

      {/* Out-of-stock alert cards */}
      {outOfStockAlerts.length > 0 && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-red-300">
            <AlertTriangle size={15} /> Out of Stock ({outOfStockAlerts.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {outOfStockAlerts.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-200">{p.name}</p>
                  <p className="text-xs text-red-400">Qty: 0</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const val = window.prompt(`Add stock for "${p.name}":`, '10')
                    const n = parseInt(val ?? '', 10)
                    if (!isNaN(n) && n > 0) handleUpdate(p.id, n)
                  }}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition-colors"
                >
                  + Stock
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Low-stock alert cards */}
      {lowStockAlerts.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
          {(() => {
            const lowVariantRows: { product: Product; variant: ProductVariant }[] = []
            for (const p of lowStockAlerts) {
              if (p.variants && p.variants.length > 0) {
                for (const v of p.variants) {
                  if (v.quantity > 0 && v.quantity <= LOW_STOCK) {
                    lowVariantRows.push({ product: p, variant: v })
                  }
                }
              } else if (p.quantity > 0 && p.quantity <= LOW_STOCK) {
                lowVariantRows.push({ product: p, variant: { id: p.id, size: '', color: '', quantity: p.quantity } as ProductVariant })
              }
            }
            return (
              <>
                <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-amber-300">
                  <AlertTriangle size={15} /> Low Stock Alert ({lowVariantRows.length} variant{lowVariantRows.length !== 1 ? 's' : ''})
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {lowVariantRows.map(({ product: p, variant: v }) => {
                    const label = [v.size, v.color].filter(Boolean).join(' · ')
                    return (
                      <div key={`${p.id}-${v.id}`} className="flex items-center justify-between rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-200">{p.name}</p>
                          {label && <p className="text-[11px] font-semibold text-slate-400">{label}</p>}
                          <p className="text-xs text-amber-400">Only {v.quantity} left</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const val = window.prompt(`Add stock for "${p.name}" — ${label || 'total'} (current: ${v.quantity}):`, '20')
                            const n = parseInt(val ?? '', 10)
                            if (!isNaN(n) && n > 0) handleUpdate(p.id, n)
                          }}
                          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors"
                        >
                          + Stock
                        </button>
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* Main table */}
      <div className="rounded-2xl border border-white/10 bg-white/5">
        {/* Table header + controls */}
        <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-4">
          <Package size={15} className="text-indigo-400 shrink-0" />
          <h2 className="text-sm font-semibold text-white">All Products — Edit Stock</h2>

          {/* Search */}
          <div className="relative ml-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search products…"
              className="w-48 rounded-xl border border-white/10 bg-white/5 py-1.5 pl-8 pr-8 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Stock filter */}
          <select
            value={stockFilter}
            onChange={(e) => handleStockFilter(e.target.value as StockFilter)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {(Object.keys(stockFilterLabel) as StockFilter[]).map((k) => (
              <option key={k} value={k}>{stockFilterLabel[k]}</option>
            ))}
          </select>

          {/* Active filter chip */}
          {(stockFilter !== 'ALL' || debouncedSearch) && (
            <button
              type="button"
              onClick={() => { handleSearch(''); handleStockFilter('ALL') }}
              className="flex items-center gap-1 rounded-full bg-indigo-500/20 px-3 py-1 text-xs text-indigo-300 hover:bg-indigo-500/30 transition-colors"
            >
              <X size={10} /> Clear filters
            </button>
          )}

          <span className="text-xs text-slate-500 ml-2 shrink-0">
            {isInitialLoading ? 'Loading…' : `${total} product${total !== 1 ? 's' : ''}`}
          </span>
        </div>

        {isInitialLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <div className="flex flex-col items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              <span className="text-sm">Loading inventory…</span>
            </div>
          </div>
        ) : allProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Package size={40} className="mb-3 opacity-30" />
            <p className="text-sm">No products match your filters.</p>
            {(stockFilter !== 'ALL' || debouncedSearch) && (
              <button
                type="button"
                onClick={() => { handleSearch(''); handleStockFilter('ALL') }}
                className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            {isRefreshing ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/20 backdrop-blur-[1px]">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              </div>
            ) : null}
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Quantity</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {allProducts.map((p) => (
                  <StockRow
                    key={p.id}
                    product={p}
                    onUpdate={handleUpdate}
                    isPending={updateMutation.isPending}
                    onRefresh={() => void queryClient.invalidateQueries({ queryKey: ['admin-inventory'] })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/10 px-5 py-4">
            <p className="text-xs text-slate-500">
              Page {page} of {totalPages} · {total} total
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300 disabled:opacity-40 hover:bg-white/10 transition-colors"
              >
                ← Prev
              </button>
              {/* Page numbers */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                const p = start + i
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      p === page
                        ? 'border-indigo-500/50 bg-indigo-500/20 text-indigo-300'
                        : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300 disabled:opacity-40 hover:bg-white/10 transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Inventory
