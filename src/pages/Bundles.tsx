import { apiErrorMessage } from '../services/api'
import type { ReactElement } from 'react'
import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { X, Search, ChevronDown, ChevronRight, Layers, Tag } from 'lucide-react'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import {
  listBundles,
  createBundle,
  updateBundle,
  deleteBundle,
  type Bundle,
  type BundleDiscountType,
  type CreateBundlePayload,
} from '../services/bundles'
import { listProducts } from '../services/products'
import { listProductCategories } from '../services/productCategories'
import { listProductSubcategoriesByCategory } from '../services/productCategorySubcategories'
import type { Product } from '../types/product'
import type { ProductCategory } from '../types/productCategory'
import type { ProductCategorySubcategory } from '../types/productCategorySubcategory'

// ─── helpers ────────────────────────────────────────────────────────────────

const toDatetimeLocal = (iso: string | null): string => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const fromDatetimeLocal = (s: string): string | undefined => {
  const t = s.trim()
  if (!t) return undefined
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

const formatDate = (iso: string | null): string => {
  if (!iso) return 'Never'
  try { return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) }
  catch { return iso }
}

// ─── Cascade selection types ─────────────────────────────────────────────────

type CascadeSelection = {
  catIds: string[]
  subIds: string[]
  manualProducts: Product[]
}

const emptyCascade = (): CascadeSelection => ({ catIds: [], subIds: [], manualProducts: [] })

type SubMap = Record<string, ProductCategorySubcategory[]>

// ─── CascadeSelector component ───────────────────────────────────────────────

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

  const handleSearchChange = (v: string) => {
    setProductSearch(v)
    if (debRef.current) clearTimeout(debRef.current)
    debRef.current = setTimeout(() => setDebouncedSearch(v), 300)
  }

  useEffect(() => {
    setSearchFetching(true)
    listProducts({ search: debouncedSearch, limit: 40 })
      .then((r) => setSearchResults(r.items))
      .catch(() => undefined)
      .finally(() => setSearchFetching(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

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
    onChange({ ...value, subIds: value.subIds.includes(subId) ? value.subIds.filter((id) => id !== subId) : [...value.subIds, subId] })
  }

  const toggleManual = (p: Product) => {
    const exists = value.manualProducts.find((m) => m.id === p.id)
    onChange({ ...value, manualProducts: exists ? value.manualProducts.filter((m) => m.id !== p.id) : [...value.manualProducts, p] })
  }

  const isSubSelected = (subId: string) => isCatDrivenSub(subId) || value.subIds.includes(subId)

  return (
    <div className="space-y-4">
      {/* Categories & Subcategories */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Layers size={14} className="text-indigo-400" />
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Categories &amp; Subcategories</p>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {categories.map((cat) => {
            const isCatSel = value.catIds.includes(cat.id)
            const catSubs = subMap[cat.id] ?? []
            const isExpanded = expandedCats.includes(cat.id)
            const isLoading = loadingSubs.includes(cat.id)
            const selSubCount = catSubs.filter((s) => isSubSelected(s.id)).length

            return (
              <div key={cat.id} className={`overflow-hidden rounded-xl border transition-all ${isCatSel ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-slate-700 bg-slate-800/40'}`}>
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <button type="button" onClick={() => toggleCat(cat.id)}
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-all ${isCatSel ? 'border-indigo-500 bg-indigo-500' : 'border-slate-600 hover:border-slate-400'}`}
                  >
                    {isCatSel && <span className="text-[9px] font-black text-white">✓</span>}
                  </button>
                  <button type="button" onClick={() => toggleCat(cat.id)} className="flex-1 text-left">
                    <span className={`text-sm font-medium ${isCatSel ? 'text-indigo-200' : 'text-slate-200'}`}>{cat.name}</span>
                    {isCatSel && <span className="ml-2 text-xs text-indigo-400/70">all included</span>}
                  </button>
                  {!isCatSel && selSubCount > 0 && (
                    <span className="text-xs font-medium text-emerald-400">{selSubCount} sub</span>
                  )}
                  <button type="button" onClick={() => toggleExpand(cat.id)}
                    className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-slate-500 transition hover:bg-white/5 hover:text-slate-300"
                  >
                    {isLoading ? <span className="animate-pulse">…</span> : isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <span>Subs</span>
                  </button>
                </div>
                {isExpanded && (
                  <div className="border-t border-slate-700/60 bg-slate-900/30 px-3 py-2.5">
                    {isLoading ? <p className="text-xs text-slate-500">Loading…</p>
                    : catSubs.length === 0 ? <p className="text-xs text-slate-500">No subcategories</p>
                    : (
                      <div className="flex flex-wrap gap-1.5">
                        {catSubs.map((sub) => {
                          const fromCat = isCatDrivenSub(sub.id)
                          const isSubSel = isSubSelected(sub.id)
                          return (
                            <button key={sub.id} type="button" onClick={() => toggleSub(sub.id)} disabled={fromCat}
                              className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                                fromCat ? 'cursor-default border border-indigo-500/20 bg-indigo-500/10 text-indigo-400/50'
                                : isSubSel ? 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                                : 'border border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                              }`}
                            >
                              <span className={`flex h-3 w-3 shrink-0 items-center justify-center rounded border ${fromCat ? 'border-indigo-500/40 bg-indigo-500/20' : isSubSel ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600'}`}>
                                {(isSubSel || fromCat) && <span className="text-[7px] font-black text-white">✓</span>}
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

      {/* Individual Products */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag size={14} className="text-emerald-400" />
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Individual Products</p>
          </div>
          {value.manualProducts.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-400">{value.manualProducts.length} selected</span>
              <button type="button" onClick={() => onChange({ ...value, manualProducts: [] })} className="text-xs text-slate-500 hover:text-slate-300">Clear</button>
            </div>
          )}
        </div>

        {value.manualProducts.length > 0 && (
          <div className="mb-2 flex max-h-20 flex-wrap gap-1.5 overflow-y-auto">
            {value.manualProducts.map((p) => (
              <span key={p.id} className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
                {p.name}
                <button type="button" onClick={() => toggleManual(p)} className="ml-0.5 text-emerald-500 hover:text-emerald-200"><X size={10} /></button>
              </span>
            ))}
          </div>
        )}

        <div className="relative mb-1.5">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={productSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search products by name…"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 py-2 pl-8 pr-3 text-sm text-slate-200 placeholder-slate-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
          />
          {searchFetching && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">…</span>}
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
          <div className="max-h-44 overflow-y-auto">
            {searchResults.length === 0 ? (
              <p className="px-4 py-5 text-center text-xs text-slate-500">
                {searchFetching ? 'Searching…' : productSearch ? 'No products found' : 'Type above to search products'}
              </p>
            ) : (
              searchResults.map((p) => {
                const isManual = !!value.manualProducts.find((m) => m.id === p.id)
                return (
                  <button key={p.id} type="button" onClick={() => toggleManual(p)}
                    className={`flex w-full items-center gap-3 border-b border-slate-800 px-3 py-2.5 text-left text-sm transition-colors last:border-0 ${isManual ? 'bg-emerald-500/8 hover:bg-emerald-500/12' : 'hover:bg-slate-800'}`}
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${isManual ? 'border-emerald-500 bg-emerald-500' : 'border-slate-600'}`}>
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
  )
}

// ─── Form state ──────────────────────────────────────────────────────────────

type FormState = {
  name: string
  description: string
  discountType: BundleDiscountType
  discountValue: string
  minItems: string
  isActive: boolean
  startsAt: string
  endsAt: string
}

const emptyForm: FormState = {
  name: '',
  description: '',
  discountType: 'PERCENT',
  discountValue: '10',
  minItems: '2',
  isActive: true,
  startsAt: '',
  endsAt: '',
}

const bundleToForm = (b: Bundle): FormState => ({
  name: b.name,
  description: b.description ?? '',
  discountType: b.discountType,
  discountValue: String(b.discountValue),
  minItems: String(b.minItems),
  isActive: b.isActive,
  startsAt: toDatetimeLocal(b.startsAt),
  endsAt: toDatetimeLocal(b.endsAt),
})

// ─── Main page ───────────────────────────────────────────────────────────────

const Bundles = (): ReactElement => {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null)
  const [bundleToDelete, setBundleToDelete] = useState<Bundle | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [selection, setSelection] = useState<CascadeSelection>(emptyCascade())
  const [selectionError, setSelectionError] = useState('')
  const [initLoading, setInitLoading] = useState(false)

  const { data: bundles = [], isLoading } = useQuery({
    queryKey: ['admin-bundles'],
    queryFn: listBundles,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['admin-product-categories'],
    queryFn: listProductCategories,
  })

  const createMutation = useMutation({
    mutationFn: createBundle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bundles'] })
      toast.success('Bundle created')
      setModalOpen(false)
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, 'Create failed')),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateBundlePayload }) => updateBundle(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bundles'] })
      toast.success('Bundle saved')
      setModalOpen(false)
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, 'Save failed')),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBundle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bundles'] })
      toast.success('Bundle deleted')
      setBundleToDelete(null)
    },
    onError: (err: unknown) => toast.error(apiErrorMessage(err, 'Delete failed')),
  })

  const openCreate = () => {
    setEditingBundle(null)
    setForm(emptyForm)
    setSelection(emptyCascade())
    setSelectionError('')
    setModalOpen(true)
  }

  const openEdit = (b: Bundle) => {
    setEditingBundle(b)
    setForm(bundleToForm(b))
    setSelection(emptyCascade())
    setSelectionError('')
    setModalOpen(true)

    // Pre-populate cascade selection from saved product IDs
    const savedIds = b.productIds ?? []
    if (savedIds.length === 0) return

    setInitLoading(true)
    Promise.all([
      listProducts({ limit: 500, page: 1 }),
      savedIds.length > 500 ? listProducts({ limit: 500, page: 2 }) : Promise.resolve({ items: [] as Product[] }),
    ]).then(([r1, r2]) => {
      const all = [...r1.items, ...r2.items]
      const savedSet = new Set(savedIds)

      const byCat: Record<string, string[]> = {}
      for (const p of all) {
        const cid = p.category?.id
        if (cid) { byCat[cid] = byCat[cid] ?? []; byCat[cid].push(p.id) }
      }
      const bySub: Record<string, string[]> = {}
      for (const p of all) {
        const raw = p as Product & { subcategory?: { id: string } }
        const sid = raw.subcategory?.id
        if (sid) { bySub[sid] = bySub[sid] ?? []; bySub[sid].push(p.id) }
      }

      const detectedCatIds: string[] = []
      const coveredByCat = new Set<string>()
      for (const [catId, pIds] of Object.entries(byCat)) {
        if (pIds.length > 0 && pIds.every((id) => savedSet.has(id))) {
          detectedCatIds.push(catId)
          pIds.forEach((id) => coveredByCat.add(id))
        }
      }
      const detectedSubIds: string[] = []
      const coveredBySub = new Set<string>()
      for (const [subId, pIds] of Object.entries(bySub)) {
        if (pIds.length > 0 && pIds.every((id) => savedSet.has(id)) && !pIds.every((id) => coveredByCat.has(id))) {
          detectedSubIds.push(subId)
          pIds.forEach((id) => coveredBySub.add(id))
        }
      }
      const manual = all.filter((p) => savedSet.has(p.id) && !coveredByCat.has(p.id) && !coveredBySub.has(p.id))

      setSelection({ catIds: detectedCatIds, subIds: detectedSubIds, manualProducts: manual })
    }).catch(() => undefined).finally(() => setInitLoading(false))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selection.catIds.length && !selection.subIds.length && !selection.manualProducts.length) {
      setSelectionError('Select at least one category, subcategory, or product.')
      return
    }
    setSelectionError('')

    let productIds: string[] = []
    try {
      const [fromCats, fromSubs] = await Promise.all([
        selection.catIds.length > 0
          ? Promise.all(selection.catIds.map((id) => listProducts({ categoryId: id, limit: 500 }).then((r) => r.items.map((p) => p.id))))
          : Promise.resolve([] as string[][]),
        selection.subIds.length > 0
          ? Promise.all(selection.subIds.map((id) => listProducts({ subcategoryId: id, limit: 500 }).then((r) => r.items.map((p) => p.id))))
          : Promise.resolve([] as string[][]),
      ])
      productIds = [...new Set([...fromCats.flat(), ...fromSubs.flat(), ...selection.manualProducts.map((p) => p.id)])]
    } catch {
      toast.error('Failed to resolve products')
      return
    }

    const payload: CreateBundlePayload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minItems: form.minItems ? Number(form.minItems) : undefined,
      productIds,
      isActive: form.isActive,
      startsAt: fromDatetimeLocal(form.startsAt),
      endsAt: fromDatetimeLocal(form.endsAt),
    }

    if (editingBundle) {
      updateMutation.mutate({ id: editingBundle.id, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const isPending = createMutation.isPending || updateMutation.isPending

  const now = new Date()
  const bundleStatus = (b: Bundle) => {
    if (!b.isActive) return { label: 'Inactive', cls: 'bg-slate-500/10 text-slate-400 ring-slate-500/20' }
    if (b.endsAt && new Date(b.endsAt) < now) return { label: 'Expired', cls: 'bg-red-500/10 text-red-400 ring-red-500/20' }
    return { label: 'Active', cls: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20' }
  }

  // Selection summary
  const summaryParts: string[] = []
  if (selection.catIds.length) summaryParts.push(`${selection.catIds.length} categor${selection.catIds.length > 1 ? 'ies' : 'y'}`)
  if (selection.subIds.length) summaryParts.push(`${selection.subIds.length} sub${selection.subIds.length > 1 ? 's' : ''}`)
  if (selection.manualProducts.length) summaryParts.push(`${selection.manualProducts.length} product${selection.manualProducts.length > 1 ? 's' : ''}`)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Bundles</h1>
          <p className="mt-1 text-sm text-slate-400">
            Create product bundles with automatic discounts applied at checkout.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-900/30 transition hover:bg-indigo-500"
        >
          + Create Bundle
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex min-h-[30vh] items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : bundles.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-white/10 bg-white/5 px-8 py-16 text-center">
          <p className="text-sm font-medium text-slate-500">No bundles yet. Create your first bundle!</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-800/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Min Items</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Ends</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {bundles.map((b) => {
                const status = bundleStatus(b)
                return (
                  <tr key={b.id} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-100">{b.name}</p>
                      {b.description && <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{b.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {b.discountType === 'PERCENT' ? `${b.discountValue}% off` : `₹${b.discountValue} off`}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{b.minItems}</td>
                    <td className="px-4 py-3 text-slate-400">{b.productIds.length}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(b.endsAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${status.cls}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => openEdit(b)} className="mr-3 text-xs font-semibold text-indigo-400 hover:text-indigo-300">Edit</button>
                      <button type="button" onClick={() => setBundleToDelete(b)} className="text-xs font-semibold text-red-400 hover:text-red-300">Delete</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setModalOpen(false)}>
          <div
            className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-slate-900 p-6 shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" onClick={() => setModalOpen(false)} className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-white/10">
              <X size={16} />
            </button>
            <h2 className="text-lg font-bold text-white">
              {editingBundle ? 'Edit Bundle' : 'Create Bundle'}
            </h2>

            {initLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <div className="text-center">
                  <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-500" />
                  <p className="text-sm">Loading bundle data…</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Name *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="Summer Bundle"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Description</label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="Buy more, save more"
                  />
                </div>

                {/* Discount */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Discount Type</label>
                    <div className="mt-2 flex gap-4">
                      {(['PERCENT', 'FLAT'] as BundleDiscountType[]).map((t) => (
                        <label key={t} className="flex items-center gap-1.5 text-sm text-slate-300 cursor-pointer">
                          <input
                            type="radio"
                            name="discountType"
                            value={t}
                            checked={form.discountType === t}
                            onChange={() => setField('discountType', t)}
                            className="accent-indigo-500"
                          />
                          {t === 'PERCENT' ? 'Percent' : 'Flat (₹)'}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Discount Value *</label>
                    <input
                      required
                      type="number"
                      min={0}
                      step={form.discountType === 'PERCENT' ? '1' : '0.01'}
                      value={form.discountValue}
                      onChange={(e) => setField('discountValue', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Min Items */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Min Items</label>
                  <input
                    type="number"
                    min={1}
                    value={form.minItems}
                    onChange={(e) => setField('minItems', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Product Selector */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Products *</label>
                    {summaryParts.length > 0 && (
                      <span className="rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-300">
                        {summaryParts.join(' · ')}
                      </span>
                    )}
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <CascadeSelector categories={categories} value={selection} onChange={setSelection} />
                  </div>
                  {selectionError && <p className="mt-1.5 text-xs text-red-400">{selectionError}</p>}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Starts At</label>
                    <input
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={(e) => setField('startsAt', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Ends At</label>
                    <input
                      type="datetime-local"
                      value={form.endsAt}
                      onChange={(e) => setField('endsAt', e.target.value)}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Active */}
                <div className="flex items-center gap-2">
                  <input
                    id="bundleIsActive"
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setField('isActive', e.target.checked)}
                    className="h-4 w-4 rounded accent-indigo-500"
                  />
                  <label htmlFor="bundleIsActive" className="text-sm text-slate-300">Active</label>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5">
                    Cancel
                  </button>
                  <button type="submit" disabled={isPending} className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 disabled:opacity-60">
                    {isPending ? 'Saving…' : editingBundle ? 'Save changes' : 'Create bundle'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        isOpen={bundleToDelete != null}
        title="Delete bundle"
        message={bundleToDelete ? `Delete bundle "${bundleToDelete.name}"? This cannot be undone.` : ''}
        isLoading={deleteMutation.isPending}
        onClose={() => setBundleToDelete(null)}
        onConfirm={() => {
          if (!bundleToDelete) return
          deleteMutation.mutate(bundleToDelete.id, { onSuccess: () => setBundleToDelete(null) })
        }}
      />
    </div>
  )
}

export default Bundles
