import type { ReactElement, FormEvent } from 'react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { Plus, Pencil, Trash2, X, Zap, Search, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react'
import {
  listFlashSales,
  createFlashSale,
  updateFlashSale,
  deleteFlashSale,
  type FlashSale,
} from '../services/flash-sales'
import { listProducts } from '../services/products'
import { listProductCategories } from '../services/productCategories'
import { listProductSubcategoriesByCategory } from '../services/productCategorySubcategories'
import type { Product } from '../types/product'
import type { ProductCategory } from '../types/productCategory'
import type { ProductCategorySubcategory } from '../types/productCategorySubcategory'

// ── Helpers ───────────────────────────────────────────────────────────────────
const getSaleStatus = (sale: FlashSale): { label: string; cls: string } => {
  if (!sale.isActive) return { label: 'Inactive', cls: 'bg-slate-700/40 text-slate-500 ring-white/10' }
  const now = Date.now()
  const start = new Date(sale.startsAt).getTime()
  const end = new Date(sale.endsAt).getTime()
  if (now < start) return { label: 'Upcoming', cls: 'bg-blue-500/10 text-blue-400 ring-blue-500/20' }
  if (now > end) return { label: 'Expired', cls: 'bg-slate-700/40 text-slate-500 ring-white/10' }
  return { label: 'Active Now', cls: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' }
}

const emptyForm = (): Partial<FlashSale> => ({
  title: '',
  discountPercent: 10,
  startsAt: '',
  endsAt: '',
  isActive: true,
  productIds: [],
})

type Scope = 'all' | 'category' | 'subcategory' | 'products'

// ── Searchable Product Picker ─────────────────────────────────────────────────
const ProductPicker = ({
  selected,
  onChange,
}: {
  selected: Product[]
  onChange: (products: Product[]) => void
}): ReactElement => {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data, isFetching } = useQuery({
    queryKey: ['flash-product-search', search],
    queryFn: () => listProducts({ search, limit: 30 }),
    enabled: open,
  })

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
  }, [])

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClickOutside])

  const toggle = (p: Product) => {
    const exists = selected.find((s) => s.id === p.id)
    onChange(exists ? selected.filter((s) => s.id !== p.id) : [...selected, p])
  }

  const results = data?.items ?? []

  return (
    <div ref={ref} className="relative">
      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((p) => (
            <span key={p.id} className="flex items-center gap-1 rounded-lg bg-indigo-600/20 px-2 py-1 text-xs text-indigo-300 ring-1 ring-indigo-500/30">
              {p.name}
              <button type="button" onClick={() => toggle(p)} className="text-indigo-400 hover:text-white">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 cursor-text"
        onClick={() => setOpen(true)}
      >
        <Search size={14} className="text-slate-500" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length ? `${selected.length} product${selected.length > 1 ? 's' : ''} selected — add more…` : 'Search products by name…'}
          className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
        />
        {isFetching && <span className="text-xs text-slate-500">…</span>}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-white/10 bg-[#0d1117] shadow-2xl">
          <div className="max-h-56 overflow-y-auto">
            {results.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-slate-500">
                {isFetching ? 'Searching…' : search ? 'No products found' : 'Type to search products'}
              </p>
            ) : (
              results.map((p) => {
                const isSelected = !!selected.find((s) => s.id === p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggle(p)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-white/5 ${isSelected ? 'bg-indigo-600/10' : ''}`}
                  >
                    <span className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center ${isSelected ? 'border-indigo-500 bg-indigo-600' : 'border-white/20'}`}>
                      {isSelected && <span className="text-white text-[10px]">✓</span>}
                    </span>
                    <span className="flex-1 truncate text-slate-200">{p.name}</span>
                    {p.category && <span className="shrink-0 text-xs text-slate-500">{p.category.name}</span>}
                    <span className="shrink-0 text-xs text-slate-400">₹{p.price}</span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Category + Subcategory Picker ─────────────────────────────────────────────
const CategoryPicker = ({
  categories,
  selectedCategoryIds,
  onCategoryChange,
}: {
  categories: ProductCategory[]
  selectedCategoryIds: string[]
  onCategoryChange: (ids: string[]) => void
}): ReactElement => {
  const toggle = (id: string) =>
    onCategoryChange(
      selectedCategoryIds.includes(id)
        ? selectedCategoryIds.filter((s) => s !== id)
        : [...selectedCategoryIds, id],
    )

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((c) => {
        const active = selectedCategoryIds.includes(c.id)
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => toggle(c.id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ring-1 transition-all ${
              active
                ? 'bg-indigo-600/20 text-indigo-300 ring-indigo-500/40'
                : 'bg-white/5 text-slate-400 ring-white/10 hover:bg-white/10'
            }`}
          >
            {active && <span className="text-indigo-400">✓</span>}
            {c.name}
            {c._count && <span className="text-slate-500">({c._count.subcategories})</span>}
          </button>
        )
      })}
    </div>
  )
}

const SubcategoryPicker = ({
  categories,
  selectedSubIds,
  onSubChange,
}: {
  categories: ProductCategory[]
  selectedSubIds: string[]
  onSubChange: (ids: string[]) => void
}): ReactElement => {
  const [expanded, setExpanded] = useState<string[]>([])
  const [subs, setSubs] = useState<Record<string, ProductCategorySubcategory[]>>({})

  const toggleExpand = async (catId: string) => {
    if (expanded.includes(catId)) {
      setExpanded((e) => e.filter((id) => id !== catId))
    } else {
      setExpanded((e) => [...e, catId])
      if (!subs[catId]) {
        const data = await listProductSubcategoriesByCategory(catId)
        setSubs((s) => ({ ...s, [catId]: data }))
      }
    }
  }

  const toggleSub = (id: string) =>
    onSubChange(
      selectedSubIds.includes(id)
        ? selectedSubIds.filter((s) => s !== id)
        : [...selectedSubIds, id],
    )

  return (
    <div className="space-y-2">
      {categories.map((cat) => (
        <div key={cat.id} className="rounded-xl border border-white/10 overflow-hidden">
          <button
            type="button"
            onClick={() => toggleExpand(cat.id)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5"
          >
            <span className="font-medium">{cat.name}</span>
            <div className="flex items-center gap-2">
              {subs[cat.id] && selectedSubIds.some((id) => subs[cat.id].find((s) => s.id === id)) && (
                <span className="text-xs text-indigo-400">
                  {subs[cat.id].filter((s) => selectedSubIds.includes(s.id)).length} selected
                </span>
              )}
              {expanded.includes(cat.id) ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
            </div>
          </button>
          {expanded.includes(cat.id) && (
            <div className="border-t border-white/10 bg-white/[0.02] px-3 py-2">
              {!subs[cat.id] ? (
                <p className="text-xs text-slate-500 py-2">Loading…</p>
              ) : subs[cat.id].length === 0 ? (
                <p className="text-xs text-slate-500 py-2">No subcategories</p>
              ) : (
                <div className="flex flex-wrap gap-2 py-1">
                  {subs[cat.id].map((sub) => {
                    const active = selectedSubIds.includes(sub.id)
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => toggleSub(sub.id)}
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs ring-1 transition-all ${
                          active
                            ? 'bg-indigo-600/20 text-indigo-300 ring-indigo-500/40'
                            : 'bg-white/5 text-slate-400 ring-white/10 hover:bg-white/10'
                        }`}
                      >
                        {active && <span>✓</span>}
                        {sub.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Scope Tab ─────────────────────────────────────────────────────────────────
const ScopeTab = ({
  value,
  current,
  label,
  description,
  onClick,
}: {
  value: Scope
  current: Scope
  label: string
  description: string
  onClick: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex flex-col gap-0.5 rounded-xl border p-3 text-left transition-all ${
      current === value
        ? 'border-indigo-500/60 bg-indigo-600/10'
        : 'border-white/10 bg-white/5 hover:bg-white/10'
    }`}
  >
    <span className={`text-xs font-semibold ${current === value ? 'text-indigo-300' : 'text-slate-300'}`}>
      {current === value && '● '}{label}
    </span>
    <span className="text-[11px] text-slate-500">{description}</span>
  </button>
)

// ── Confirmation Modal ────────────────────────────────────────────────────────
const ConfirmModal = ({
  title,
  discountPercent,
  scope,
  selectedProducts,
  selectedCategoryIds,
  selectedSubIds,
  categories,
  onConfirm,
  onCancel,
  isPending,
}: {
  title: string
  discountPercent: number
  scope: Scope
  selectedProducts: Product[]
  selectedCategoryIds: string[]
  selectedSubIds: string[]
  categories: ProductCategory[]
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}): ReactElement => {
  const scopeText =
    scope === 'all'
      ? 'All products in the store'
      : scope === 'category'
      ? `${selectedCategoryIds.length} categor${selectedCategoryIds.length === 1 ? 'y' : 'ies'}: ${selectedCategoryIds.map((id) => categories.find((c) => c.id === id)?.name ?? id).join(', ')}`
      : scope === 'subcategory'
      ? `${selectedSubIds.length} subcategor${selectedSubIds.length === 1 ? 'y' : 'ies'}`
      : `${selectedProducts.length} specific product${selectedProducts.length !== 1 ? 's' : ''}`

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0d1117] p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
            <Zap size={18} className="text-amber-400" />
          </div>
          <div>
            <p className="font-semibold text-white">Confirm Flash Sale</p>
            <p className="text-xs text-slate-400">Review before saving</p>
          </div>
        </div>
        <div className="space-y-2 rounded-xl bg-white/5 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Title</span>
            <span className="font-medium text-white">{title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Discount</span>
            <span className="font-semibold text-emerald-400">{discountPercent}% off</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="shrink-0 text-slate-400">Applies to</span>
            <span className="text-right text-slate-200 text-xs">{scopeText}</span>
          </div>
        </div>
        {scope === 'all' && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2.5 text-xs text-amber-400">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            This will apply the discount to every product in your store.
          </div>
        )}
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-slate-400 hover:bg-white/5">
            Go back
          </button>
          <button type="button" onClick={onConfirm} disabled={isPending} className="flex-1 rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            {isPending ? 'Saving…' : 'Confirm & Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Sale Modal ────────────────────────────────────────────────────────────────
const SaleModal = ({
  sale,
  onClose,
  categories,
}: {
  sale: Partial<FlashSale> | null
  onClose: () => void
  categories: ProductCategory[]
}): ReactElement => {
  const queryClient = useQueryClient()
  const isEdit = !!sale?.id
  const [form, setForm] = useState<Partial<FlashSale>>(sale ?? emptyForm())
  const [scope, setScope] = useState<Scope>((sale?.productIds?.length ?? 0) > 0 ? 'products' : 'all')
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([])
  const [showConfirm, setShowConfirm] = useState(false)
  const [scopeError, setScopeError] = useState('')

  // Pre-populate selected products when editing a sale that has productIds
  useEffect(() => {
    if (!isEdit || !sale?.productIds?.length) return
    listProducts({ limit: 500 }).then((r) => {
      const ids = new Set(sale.productIds!)
      setSelectedProducts(r.items.filter((p) => ids.has(p.id)))
    }).catch(() => undefined)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = <K extends keyof FlashSale>(k: K, v: FlashSale[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const saveMutation = useMutation({
    mutationFn: async () => {
      let productIds: string[] = []
      if (scope === 'products') {
        productIds = selectedProducts.map((p) => p.id)
      } else if (scope === 'category' && selectedCategoryIds.length > 0) {
        // Resolve all products in selected categories
        const results = await Promise.all(
          selectedCategoryIds.map((id) =>
            listProducts({ categoryId: id, limit: 500 }).then((r) => r.items.map((p) => p.id)),
          ),
        )
        productIds = [...new Set(results.flat())]
      } else if (scope === 'subcategory' && selectedSubIds.length > 0) {
        const results = await Promise.all(
          selectedSubIds.map((id) =>
            listProducts({ subcategoryId: id, limit: 500 }).then((r) => r.items.map((p) => p.id)),
          ),
        )
        productIds = [...new Set(results.flat())]
      }
      // scope === 'all': productIds stays [] → backend treats as all products
      return isEdit
        ? updateFlashSale(form.id!, { ...form, productIds })
        : createFlashSale({ ...form, productIds })
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Flash sale updated' : 'Flash sale created')
      void queryClient.invalidateQueries({ queryKey: ['admin-flash-sales'] })
      onClose()
    },
    onError: () => toast.error('Failed to save flash sale'),
  })

  const validate = (): boolean => {
    if (scope === 'products' && selectedProducts.length === 0) {
      setScopeError('Please select at least one product.')
      return false
    }
    if (scope === 'category' && selectedCategoryIds.length === 0) {
      setScopeError('Please select at least one category.')
      return false
    }
    if (scope === 'subcategory' && selectedSubIds.length === 0) {
      setScopeError('Please select at least one subcategory.')
      return false
    }
    setScopeError('')
    return true
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (validate()) setShowConfirm(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-[#0d1117] p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">{isEdit ? 'Edit Flash Sale' : 'New Flash Sale'}</h2>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Sale Title *</label>
            <input
              required
              value={form.title ?? ''}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Weekend Mega Sale"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Discount */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Discount % *</label>
            <div className="flex items-center gap-3">
              <input
                required
                type="number"
                min={1}
                max={100}
                value={form.discountPercent ?? 10}
                onChange={(e) => set('discountPercent', parseFloat(e.target.value))}
                className="w-28 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-2xl font-black text-emerald-400">{form.discountPercent ?? 10}% off</span>
            </div>
          </div>

          {/* Dates */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Starts At *</label>
              <input required type="datetime-local" value={form.startsAt?.slice(0, 16) ?? ''} onChange={(e) => set('startsAt', e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Ends At *</label>
              <input required type="datetime-local" value={form.endsAt?.slice(0, 16) ?? ''} onChange={(e) => set('endsAt', e.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>
          </div>

          {/* Scope — MANDATORY */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-slate-400">Apply Discount To *</label>
              <span className="text-xs text-slate-500">Select one option below</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <ScopeTab value="all" current={scope} label="All Products" description="Entire catalogue" onClick={() => { setScope('all'); setScopeError('') }} />
              <ScopeTab value="category" current={scope} label="Category" description="Whole category" onClick={() => { setScope('category'); setScopeError('') }} />
              <ScopeTab value="subcategory" current={scope} label="Sub-category" description="Specific sub" onClick={() => { setScope('subcategory'); setScopeError('') }} />
              <ScopeTab value="products" current={scope} label="Products" description="Hand-pick items" onClick={() => { setScope('products'); setScopeError('') }} />
            </div>
          </div>

          {/* Scope content */}
          {scope === 'all' && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-4 py-3 text-xs text-amber-400">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              Discount applies to <strong className="mx-1">every product</strong> in the store during this period.
            </div>
          )}

          {scope === 'category' && (
            <div>
              <p className="mb-2 text-xs text-slate-400">Select one or more categories:</p>
              {categories.length === 0 ? (
                <p className="text-xs text-slate-500">Loading…</p>
              ) : (
                <CategoryPicker
                  categories={categories}
                  selectedCategoryIds={selectedCategoryIds}
                  onCategoryChange={(ids) => { setSelectedCategoryIds(ids); setScopeError('') }}
                />
              )}
            </div>
          )}

          {scope === 'subcategory' && (
            <div>
              <p className="mb-2 text-xs text-slate-400">Expand a category to pick subcategories:</p>
              <SubcategoryPicker
                categories={categories}
                selectedSubIds={selectedSubIds}
                onSubChange={(ids) => { setSelectedSubIds(ids); setScopeError('') }}
              />
            </div>
          )}

          {scope === 'products' && (
            <div>
              <p className="mb-2 text-xs text-slate-400">Search and select specific products:</p>
              <ProductPicker
                selected={selectedProducts}
                onChange={(p) => { setSelectedProducts(p); setScopeError('') }}
              />
            </div>
          )}

          {scopeError && (
            <p className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle size={12} /> {scopeError}
            </p>
          )}

          {/* Active */}
          <div className="flex items-center gap-3">
            <input id="saleActive" type="checkbox" checked={form.isActive ?? true} onChange={(e) => set('isActive', e.target.checked)} className="h-4 w-4 rounded accent-indigo-600" />
            <label htmlFor="saleActive" className="text-sm text-slate-300">Active (visible to customers)</label>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/5">Cancel</button>
            <button type="submit" className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
              {isEdit ? 'Save Changes' : 'Create Sale'}
            </button>
          </div>
        </form>
      </div>

      {showConfirm && (
        <ConfirmModal
          title={form.title ?? ''}
          discountPercent={form.discountPercent ?? 0}
          scope={scope}
          selectedProducts={selectedProducts}
          selectedCategoryIds={selectedCategoryIds}
          selectedSubIds={selectedSubIds}
          categories={categories}
          onConfirm={() => saveMutation.mutate()}
          onCancel={() => setShowConfirm(false)}
          isPending={saveMutation.isPending}
        />
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const FlashSales = (): ReactElement => {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<Partial<FlashSale> | null | false>(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['admin-flash-sales'],
    queryFn: listFlashSales,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-product-categories'],
    queryFn: listProductCategories,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteFlashSale,
    onSuccess: () => {
      toast.success('Flash sale deleted')
      setDeleteId(null)
      void queryClient.invalidateQueries({ queryKey: ['admin-flash-sales'] })
    },
    onError: () => toast.error('Failed to delete'),
  })

  return (
    <div className="space-y-6">
      {modal !== false && (
        <SaleModal sale={modal} onClose={() => setModal(false)} categories={categories} />
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative rounded-2xl border border-white/10 bg-[#0d1117] p-6 shadow-2xl">
            <p className="mb-1 font-semibold text-white">Delete Flash Sale?</p>
            <p className="mb-4 text-sm text-slate-400">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/5">Cancel</button>
              <button onClick={() => deleteMutation.mutate(deleteId)} disabled={deleteMutation.isPending} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50">
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Flash Sales</h1>
          <p className="mt-1 text-sm text-slate-400">Time-limited discount campaigns shown on the Sale page.</p>
        </div>
        <button
          type="button"
          onClick={() => setModal(emptyForm())}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          <Plus size={16} /> New Flash Sale
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">Loading…</div>
      ) : sales.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-white/10 py-16 text-center text-slate-500">
          <Zap size={32} className="mx-auto mb-3 text-slate-700" />
          <p>No flash sales yet.</p>
          <button onClick={() => setModal(emptyForm())} className="mt-2 text-indigo-400 hover:underline text-sm">Create your first sale →</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sales.map((sale) => {
            const { label, cls } = getSaleStatus(sale)
            return (
              <div key={sale.id} className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Zap size={16} className="shrink-0 text-amber-400" />
                    <p className="font-semibold text-slate-100 truncate">{sale.title}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${cls}`}>{label}</span>
                </div>
                <div className="text-3xl font-black text-white">{sale.discountPercent}% <span className="text-lg font-semibold text-emerald-400">off</span></div>
                <div className="space-y-1 text-xs text-slate-500">
                  <p>From: {new Date(sale.startsAt).toLocaleString('en-IN')}</p>
                  <p>Until: {new Date(sale.endsAt).toLocaleString('en-IN')}</p>
                  <p className={sale.productIds.length === 0 ? 'text-amber-400/70' : ''}>
                    {sale.productIds.length === 0 ? '⚡ All products' : `${sale.productIds.length} product${sale.productIds.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setModal(sale)} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/10 py-1.5 text-xs text-slate-300 hover:bg-white/5">
                    <Pencil size={12} /> Edit
                  </button>
                  <button type="button" onClick={() => setDeleteId(sale.id)} className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default FlashSales
