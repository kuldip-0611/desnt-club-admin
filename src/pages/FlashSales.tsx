import type { ReactElement, FormEvent } from 'react'
import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { Plus, Pencil, Trash2, X, Zap, Search, ChevronDown, ChevronRight, AlertCircle, ArrowLeft, Tag, Calendar, Layers } from 'lucide-react'
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

// ─────────────────────────────────────────────────────────────────────────────
const getSaleStatus = (sale: FlashSale): { label: string; cls: string } => {
  if (!sale.isActive) return { label: 'Inactive', cls: 'bg-slate-700/40 text-slate-500 ring-white/10' }
  const now = Date.now()
  if (now < new Date(sale.startsAt).getTime()) return { label: 'Upcoming', cls: 'bg-blue-500/10 text-blue-400 ring-blue-500/20' }
  if (now > new Date(sale.endsAt).getTime()) return { label: 'Expired', cls: 'bg-slate-700/40 text-slate-500 ring-white/10' }
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

// ─────────────────────────────────────────────────────────────────────────────
// Cascade Selection types
// ─────────────────────────────────────────────────────────────────────────────
type CascadeSelection = {
  allProducts: boolean
  catIds: string[]          // whole-category selections
  subIds: string[]          // direct subcategory selections
  manualProducts: Product[] // individually picked
}

const emptyCascade = (): CascadeSelection => ({
  allProducts: true,
  catIds: [],
  subIds: [],
  manualProducts: [],
})

type SubMap = Record<string, ProductCategorySubcategory[]>

// ─────────────────────────────────────────────────────────────────────────────
// Cascade Selector component
// ─────────────────────────────────────────────────────────────────────────────
const CascadeSelector = ({
  categories,
  value,
  onChange,
}: {
  categories: ProductCategory[]
  value: CascadeSelection
  onChange: (v: CascadeSelection) => void
}): ReactElement => {
  const [subMap, setSubMap] = useState<SubMap>({})
  const [loadingSubs, setLoadingSubs] = useState<string[]>([])
  const [expandedCats, setExpandedCats] = useState<string[]>([])
  const [productSearch, setProductSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searchFetching, setSearchFetching] = useState(false)

  // Debounced product search
  const handleSearchChange = (v: string) => {
    setProductSearch(v)
    if (debRef.current) clearTimeout(debRef.current)
    debRef.current = setTimeout(() => setDebouncedSearch(v), 300)
  }

  useEffect(() => {
    if (value.allProducts) return
    setSearchFetching(true)
    listProducts({ search: debouncedSearch, limit: 40 })
      .then((r) => setSearchResults(r.items))
      .catch(() => undefined)
      .finally(() => setSearchFetching(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, value.allProducts])

  const loadSubs = async (catId: string) => {
    if (subMap[catId]) return
    setLoadingSubs((l) => [...l, catId])
    try {
      const data = await listProductSubcategoriesByCategory(catId)
      setSubMap((m) => ({ ...m, [catId]: data }))
    } finally {
      setLoadingSubs((l) => l.filter((id) => id !== catId))
    }
  }

  const toggleExpand = (catId: string) => {
    if (expandedCats.includes(catId)) {
      setExpandedCats((e) => e.filter((id) => id !== catId))
    } else {
      setExpandedCats((e) => [...e, catId])
      void loadSubs(catId)
    }
  }

  // Auto-expand selected categories so subs are visible
  useEffect(() => {
    value.catIds.forEach((id) => {
      if (!expandedCats.includes(id)) {
        setExpandedCats((e) => [...e, id])
        void loadSubs(id)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.catIds.join(',')])

  const toggleCat = (catId: string) => {
    if (value.catIds.includes(catId)) {
      const catSubs = (subMap[catId] ?? []).map((s) => s.id)
      onChange({ ...value, catIds: value.catIds.filter((id) => id !== catId), subIds: value.subIds.filter((id) => !catSubs.includes(id)) })
    } else {
      void loadSubs(catId)
      if (!expandedCats.includes(catId)) setExpandedCats((e) => [...e, catId])
      onChange({ ...value, catIds: [...value.catIds, catId] })
    }
  }

  const isCatDrivenSub = (subId: string) =>
    Object.entries(subMap).some(([catId, subs]) => value.catIds.includes(catId) && subs.some((s) => s.id === subId))

  const toggleSub = (subId: string) => {
    if (isCatDrivenSub(subId)) return
    onChange({
      ...value,
      subIds: value.subIds.includes(subId) ? value.subIds.filter((id) => id !== subId) : [...value.subIds, subId],
    })
  }

  const toggleManual = (p: Product) => {
    const exists = value.manualProducts.find((m) => m.id === p.id)
    onChange({ ...value, manualProducts: exists ? value.manualProducts.filter((m) => m.id !== p.id) : [...value.manualProducts, p] })
  }

  const isSubSelected = (subId: string) => isCatDrivenSub(subId) || value.subIds.includes(subId)

  return (
    <div className="space-y-3">
      {/* All Products toggle */}
      <button
        type="button"
        onClick={() => onChange({ ...emptyCascade(), allProducts: !value.allProducts })}
        className={`flex w-full items-center gap-3 rounded-2xl border-2 px-5 py-4 text-left transition-all ${
          value.allProducts ? 'border-amber-500/50 bg-amber-500/8' : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
        }`}
      >
        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
          value.allProducts ? 'border-amber-400 bg-amber-400' : 'border-slate-600'
        }`}>
          {value.allProducts && <span className="text-[11px] font-black text-black">✓</span>}
        </span>
        <div className="flex-1">
          <p className={`font-semibold ${value.allProducts ? 'text-amber-300' : 'text-slate-200'}`}>Apply to All Products</p>
          <p className="text-xs text-slate-500">Discount applies to your entire catalogue during this period</p>
        </div>
        {value.allProducts && (
          <span className="shrink-0 rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-400">⚡ All</span>
        )}
      </button>

      {/* Custom selection */}
      {!value.allProducts && (
        <div className="space-y-4 rounded-2xl border border-slate-700 bg-slate-800/30 p-5">

          {/* ── Section: Categories & Subcategories ── */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Layers size={14} className="text-indigo-400" />
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Categories &amp; Subcategories</p>
            </div>
            <div className="space-y-2">
              {categories.map((cat) => {
                const isCatSel = value.catIds.includes(cat.id)
                const catSubs = subMap[cat.id] ?? []
                const isExpanded = expandedCats.includes(cat.id)
                const isLoading = loadingSubs.includes(cat.id)
                const selSubCount = catSubs.filter((s) => isSubSelected(s.id)).length

                return (
                  <div
                    key={cat.id}
                    className={`overflow-hidden rounded-xl border transition-all ${isCatSel ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-slate-700 bg-slate-800/40'}`}
                  >
                    {/* Category row */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleCat(cat.id)}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                          isCatSel ? 'border-indigo-500 bg-indigo-500' : 'border-slate-600 hover:border-slate-400'
                        }`}
                      >
                        {isCatSel && <span className="text-[10px] font-black text-white">✓</span>}
                      </button>
                      <button type="button" onClick={() => toggleCat(cat.id)} className="flex-1 text-left">
                        <span className={`text-sm font-medium ${isCatSel ? 'text-indigo-200' : 'text-slate-200'}`}>{cat.name}</span>
                        {isCatSel && <span className="ml-2 text-xs text-indigo-400/80">all products included</span>}
                      </button>
                      {!isCatSel && selSubCount > 0 && (
                        <span className="text-xs font-medium text-emerald-400">{selSubCount} sub</span>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleExpand(cat.id)}
                        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
                      >
                        {isLoading ? <span className="animate-pulse">…</span> : isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        <span>Subcategories</span>
                      </button>
                    </div>

                    {/* Subcategory chips */}
                    {isExpanded && (
                      <div className="border-t border-slate-700/60 bg-slate-900/30 px-4 py-3">
                        {isLoading ? (
                          <p className="text-xs text-slate-500">Loading…</p>
                        ) : catSubs.length === 0 ? (
                          <p className="text-xs text-slate-500">No subcategories</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {catSubs.map((sub) => {
                              const fromCat = isCatDrivenSub(sub.id)
                              const isSubSel = isSubSelected(sub.id)
                              return (
                                <button
                                  key={sub.id}
                                  type="button"
                                  onClick={() => toggleSub(sub.id)}
                                  disabled={fromCat}
                                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                                    fromCat
                                      ? 'cursor-default border border-indigo-500/20 bg-indigo-500/10 text-indigo-400/50'
                                      : isSubSel
                                      ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                                      : 'border border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                                  }`}
                                >
                                  <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                                    fromCat ? 'border-indigo-500/40 bg-indigo-500/20'
                                    : isSubSel ? 'border-emerald-500 bg-emerald-500'
                                    : 'border-slate-600'
                                  }`}>
                                    {(isSubSel || fromCat) && <span className="text-[8px] font-black text-white">✓</span>}
                                  </span>
                                  {sub.name}
                                  {fromCat && <span className="text-[9px] text-indigo-400/50">auto</span>}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-700/60" />

          {/* ── Section: Individual Products ── */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag size={14} className="text-emerald-400" />
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Individual Products</p>
              </div>
              {value.manualProducts.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                    {value.manualProducts.length} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => onChange({ ...value, manualProducts: [] })}
                    className="text-xs text-slate-500 hover:text-slate-300"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Selected product tags */}
            {value.manualProducts.length > 0 && (
              <div className="mb-3 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                {value.manualProducts.map((p) => (
                  <span key={p.id} className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                    {p.name}
                    <button type="button" onClick={() => toggleManual(p)} className="ml-0.5 text-emerald-500 hover:text-emerald-200">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search input */}
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={productSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search products by name to add…"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2.5 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              />
              {searchFetching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">…</span>}
            </div>

            {/* Results list */}
            <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
              <div className="max-h-56 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-slate-500">
                    {searchFetching ? 'Searching…' : productSearch ? 'No products found' : 'Type above to search products'}
                  </p>
                ) : (
                  searchResults.map((p) => {
                    const isManual = !!value.manualProducts.find((m) => m.id === p.id)
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleManual(p)}
                        className={`flex w-full items-center gap-3 border-b border-slate-800 px-4 py-3 text-left text-sm transition-colors last:border-0 ${
                          isManual ? 'bg-emerald-500/8 hover:bg-emerald-500/12' : 'hover:bg-slate-800'
                        }`}
                      >
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          isManual ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600'
                        }`}>
                          {isManual && <span className="text-[10px] font-black text-white">✓</span>}
                        </span>
                        <span className="flex-1 truncate text-slate-200">{p.name}</span>
                        {p.category && <span className="shrink-0 text-xs text-slate-500">{p.category.name}</span>}
                        <span className="shrink-0 text-xs font-semibold text-slate-400">₹{p.price}</span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sale Form (full-page, not modal)
// ─────────────────────────────────────────────────────────────────────────────
const SaleForm = ({
  sale,
  categories,
  onDone,
}: {
  sale: Partial<FlashSale> | null
  categories: ProductCategory[]
  onDone: () => void
}): ReactElement => {
  const queryClient = useQueryClient()
  const isEdit = !!sale?.id
  const [form, setForm] = useState<Partial<FlashSale>>(sale ?? emptyForm())
  const [selection, setSelection] = useState<CascadeSelection>(emptyCascade())
  const [selectionError, setSelectionError] = useState('')
  const [saving, setSaving] = useState(false)
  const [initLoading, setInitLoading] = useState(isEdit && (sale?.productIds?.length ?? 0) > 0)

  // Pre-populate on edit
  useEffect(() => {
    if (!isEdit) {
      setSelection(emptyCascade())
      return
    }
    const savedIds = sale?.productIds ?? []
    if (savedIds.length === 0) {
      setSelection(emptyCascade())
      setInitLoading(false)
      return
    }

    // Load all products then figure out which cats/subs are fully covered
    Promise.all([
      listProducts({ limit: 500, page: 1 }),
      savedIds.length > 500 ? listProducts({ limit: 500, page: 2 }) : Promise.resolve({ items: [] as Product[] }),
    ]).then(([r1, r2]) => {
      const all = [...r1.items, ...r2.items]
      const savedSet = new Set(savedIds)

      // Group products by categoryId
      const byCat: Record<string, string[]> = {}
      for (const p of all) {
        const cid = p.category?.id
        if (cid) { byCat[cid] = byCat[cid] ?? []; byCat[cid].push(p.id) }
      }

      // Group products by subcategoryId (field may be sub or subcategory)
      const bySub: Record<string, string[]> = {}
      for (const p of all) {
        const raw = p as Product & { subcategory?: { id: string }; sub?: { id: string } }
        const sid = raw.subcategory?.id ?? raw.sub?.id
        if (sid) { bySub[sid] = bySub[sid] ?? []; bySub[sid].push(p.id) }
      }

      // Detect fully-covered categories
      const detectedCatIds: string[] = []
      const coveredByCat = new Set<string>()
      for (const [catId, pIds] of Object.entries(byCat)) {
        if (pIds.length > 0 && pIds.every((id) => savedSet.has(id))) {
          detectedCatIds.push(catId)
          pIds.forEach((id) => coveredByCat.add(id))
        }
      }

      // Detect fully-covered subcategories (not already all covered by a cat)
      const detectedSubIds: string[] = []
      const coveredBySub = new Set<string>()
      for (const [subId, pIds] of Object.entries(bySub)) {
        if (pIds.length > 0 && pIds.every((id) => savedSet.has(id)) && !pIds.every((id) => coveredByCat.has(id))) {
          detectedSubIds.push(subId)
          pIds.forEach((id) => coveredBySub.add(id))
        }
      }

      // Remaining = manually picked
      const manual = all.filter((p) => savedSet.has(p.id) && !coveredByCat.has(p.id) && !coveredBySub.has(p.id))

      setSelection({
        allProducts: false,
        catIds: detectedCatIds,
        subIds: detectedSubIds,
        manualProducts: manual,
      })
    }).catch(() => undefined).finally(() => setInitLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = <K extends keyof FlashSale>(k: K, v: FlashSale[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!selection.allProducts && !selection.catIds.length && !selection.subIds.length && !selection.manualProducts.length) {
      setSelectionError('Select at least one category, subcategory, or product.')
      return
    }
    setSelectionError('')
    setSaving(true)
    try {
      let productIds: string[] = []
      if (!selection.allProducts) {
        const [fromCats, fromSubs] = await Promise.all([
          selection.catIds.length > 0
            ? Promise.all(selection.catIds.map((id) => listProducts({ categoryId: id, limit: 500 }).then((r) => r.items.map((p) => p.id))))
            : Promise.resolve([] as string[][]),
          selection.subIds.length > 0
            ? Promise.all(selection.subIds.map((id) => listProducts({ subcategoryId: id, limit: 500 }).then((r) => r.items.map((p) => p.id))))
            : Promise.resolve([] as string[][]),
        ])
        productIds = [...new Set([...fromCats.flat(), ...fromSubs.flat(), ...selection.manualProducts.map((p) => p.id)])]
      }
      if (isEdit) await updateFlashSale(form.id!, { ...form, productIds })
      else await createFlashSale({ ...form, productIds })
      toast.success(isEdit ? 'Flash sale updated!' : 'Flash sale created!')
      void queryClient.invalidateQueries({ queryKey: ['admin-flash-sales'] })
      onDone()
    } catch {
      toast.error('Failed to save flash sale')
    } finally {
      setSaving(false)
    }
  }

  const summaryParts: string[] = []
  if (selection.allProducts) summaryParts.push('All products')
  else {
    if (selection.catIds.length) summaryParts.push(`${selection.catIds.length} categor${selection.catIds.length > 1 ? 'ies' : 'y'}`)
    if (selection.subIds.length) summaryParts.push(`${selection.subIds.length} sub${selection.subIds.length > 1 ? 's' : ''}`)
    if (selection.manualProducts.length) summaryParts.push(`${selection.manualProducts.length} product${selection.manualProducts.length > 1 ? 's' : ''}`)
  }

  if (initLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-500" />
          <p className="text-sm">Loading sale data…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <button
          type="button"
          onClick={onDone}
          className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-400 transition hover:border-slate-600 hover:bg-white/5 hover:text-slate-200"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <div>
          <h2 className="text-xl font-bold text-white">{isEdit ? 'Edit Flash Sale' : 'New Flash Sale'}</h2>
          <p className="text-xs text-slate-500">{isEdit ? 'Update the sale details below' : 'Fill in the details to create a new campaign'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Card: Basic Info ── */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-6">
          <div className="mb-5 flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/20">
              <Zap size={14} className="text-indigo-400" />
            </div>
            <h3 className="font-semibold text-slate-200">Campaign Info</h3>
          </div>
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-400">Sale Title *</label>
              <input
                required
                value={form.title ?? ''}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Weekend Mega Sale"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              />
            </div>

            {/* Discount */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-400">Discount Percentage *</label>
              <div className="flex items-center gap-4">
                <input
                  required
                  type="number"
                  min={1}
                  max={100}
                  value={form.discountPercent ?? 10}
                  onChange={(e) => set('discountPercent', parseFloat(e.target.value))}
                  className="w-28 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                />
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-emerald-400">{form.discountPercent ?? 10}%</span>
                  <span className="text-lg font-semibold text-slate-400">off</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Card: Schedule ── */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-6">
          <div className="mb-5 flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/20">
              <Calendar size={14} className="text-blue-400" />
            </div>
            <h3 className="font-semibold text-slate-200">Schedule</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-400">Starts At *</label>
              <input
                required
                type="datetime-local"
                value={form.startsAt?.slice(0, 16) ?? ''}
                onChange={(e) => set('startsAt', e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-400">Ends At *</label>
              <input
                required
                type="datetime-local"
                value={form.endsAt?.slice(0, 16) ?? ''}
                onChange={(e) => set('endsAt', e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 focus:border-indigo-500/60 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
              />
            </div>
          </div>
        </div>

        {/* ── Card: Product Selection ── */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600/20">
                <Tag size={14} className="text-amber-400" />
              </div>
              <h3 className="font-semibold text-slate-200">Apply Discount To *</h3>
            </div>
            {summaryParts.length > 0 && (
              <span className="rounded-full bg-indigo-600/20 px-3 py-1 text-xs font-semibold text-indigo-300">
                {summaryParts.join(' + ')}
              </span>
            )}
          </div>
          <CascadeSelector
            categories={categories}
            value={selection}
            onChange={(v) => { setSelection(v); setSelectionError('') }}
          />
          {selectionError && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle size={12} /> {selectionError}
            </p>
          )}
        </div>

        {/* ── Card: Settings ── */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800/40 px-6 py-4">
          <label className="flex cursor-pointer items-center gap-3">
            <div
              onClick={() => set('isActive', !form.isActive)}
              className={`relative h-5 w-9 rounded-full transition-colors ${form.isActive ? 'bg-indigo-600' : 'bg-slate-700'}`}
            >
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">Active</p>
              <p className="text-xs text-slate-500">Visible to customers when active</p>
            </div>
          </label>
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <button
            type="button"
            onClick={onDone}
            className="rounded-xl border border-slate-700 px-6 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Saving…
              </>
            ) : (
              <>{isEdit ? 'Save Changes' : 'Create Flash Sale'}</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
const FlashSales = (): ReactElement => {
  const queryClient = useQueryClient()
  const [view, setView] = useState<'list' | 'form'>('list')
  const [editingSale, setEditingSale] = useState<Partial<FlashSale> | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['admin-flash-sales'],
    queryFn: listFlashSales,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-product-categories'],
    queryFn: listProductCategories,
  })

  const openNew = () => { setEditingSale(null); setView('form') }
  const openEdit = (sale: FlashSale) => { setEditingSale(sale); setView('form') }
  const closeForm = () => { setView('list'); setEditingSale(null) }

  const confirmDelete = async () => {
    if (!deleteId) return
    try {
      await deleteFlashSale(deleteId)
      toast.success('Flash sale deleted')
      void queryClient.invalidateQueries({ queryKey: ['admin-flash-sales'] })
    } catch {
      toast.error('Failed to delete')
    } finally {
      setDeleteId(null)
    }
  }

  // ── Delete confirm modal ──────────────────────────────────────────────────
  const DeleteModal = deleteId ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-700 bg-[#0d1117] p-6 shadow-2xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
          <Trash2 size={20} className="text-red-400" />
        </div>
        <p className="mb-1 text-base font-semibold text-white">Delete Flash Sale?</p>
        <p className="mb-5 text-sm text-slate-400">This action cannot be undone. The sale will be removed from the storefront immediately.</p>
        <div className="flex gap-3">
          <button onClick={() => setDeleteId(null)} className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm text-slate-400 hover:bg-white/5">
            Cancel
          </button>
          <button onClick={confirmDelete} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-500">
            Delete
          </button>
        </div>
      </div>
    </div>
  ) : null

  // ── Form view ─────────────────────────────────────────────────────────────
  if (view === 'form') {
    return (
      <div>
        {DeleteModal}
        <SaleForm sale={editingSale} categories={categories} onDone={closeForm} />
      </div>
    )
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {DeleteModal}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Flash Sales</h1>
          <p className="mt-1 text-sm text-slate-400">Time-limited discount campaigns shown on the Sale page.</p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          <Plus size={16} /> New Flash Sale
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500" />
        </div>
      ) : sales.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-700 py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
            <Zap size={28} className="text-slate-600" />
          </div>
          <p className="mb-1 font-semibold text-slate-400">No flash sales yet</p>
          <p className="mb-5 text-sm text-slate-500">Create your first time-limited discount campaign</p>
          <button onClick={openNew} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500">
            Create Flash Sale
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sales.map((sale) => {
            const { label, cls } = getSaleStatus(sale)
            return (
              <div key={sale.id} className="group rounded-2xl border border-slate-700 bg-slate-800/40 p-5 transition hover:border-slate-600 hover:bg-slate-800/70">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Zap size={15} className="shrink-0 text-amber-400" />
                    <p className="truncate font-semibold text-slate-100">{sale.title}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${cls}`}>{label}</span>
                </div>

                <div className="mb-3 flex items-baseline gap-1.5">
                  <span className="text-4xl font-black text-white">{sale.discountPercent}%</span>
                  <span className="text-base font-semibold text-emerald-400">off</span>
                </div>

                <div className="mb-4 space-y-1 text-xs text-slate-500">
                  <p>From: {new Date(sale.startsAt).toLocaleString('en-IN')}</p>
                  <p>Until: {new Date(sale.endsAt).toLocaleString('en-IN')}</p>
                  <p className={sale.productIds.length === 0 ? 'font-medium text-amber-400/80' : ''}>
                    {sale.productIds.length === 0 ? '⚡ Entire catalogue' : `${sale.productIds.length} product${sale.productIds.length !== 1 ? 's' : ''}`}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(sale)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-600 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-500 hover:bg-white/5"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(sale.id)}
                    className="flex items-center justify-center rounded-xl border border-red-500/20 px-3 py-2 text-xs text-red-400 transition hover:bg-red-500/10"
                  >
                    <Trash2 size={13} />
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
