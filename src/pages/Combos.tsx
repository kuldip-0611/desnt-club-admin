import { apiErrorMessage } from '../services/api'
import type { ReactElement } from 'react'
import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { X, Plus, Trash2, Package, Search, ChevronDown, ChevronRight, IndianRupee } from 'lucide-react'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import {
  listCombos, createCombo, updateCombo, deleteCombo,
  type Combo, type ComboItemPayload, type CreateComboPayload,
} from '../services/combos'
import { listProducts } from '../services/products'
import type { Product } from '../types/product'

// ─── helpers ────────────────────────────────────────────────────────────────

const toDatetimeLocal = (iso: string | null): string => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const fromDatetimeLocal = (s: string): string | null => {
  const t = s.trim()
  if (!t) return null
  const d = new Date(t)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

const toSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')

const imgUrl = (path: string) =>
  path.startsWith('http') ? path : `${import.meta.env.VITE_API_URL?.replace('/api', '') ?? ''}${path}`

// ─── empty form ──────────────────────────────────────────────────────────────

interface FormState {
  name: string
  slug: string
  description: string
  price: string
  isActive: boolean
  startsAt: string
  endsAt: string
  items: ComboItemPayload[]
}

const EMPTY: FormState = {
  name: '', slug: '', description: '', price: '', isActive: true,
  startsAt: '', endsAt: '', items: [],
}

const comboToForm = (c: Combo): FormState => ({
  name: c.name,
  slug: c.slug,
  description: c.description ?? '',
  price: String(c.price),
  isActive: c.isActive,
  startsAt: toDatetimeLocal(c.startsAt),
  endsAt: toDatetimeLocal(c.endsAt),
  items: c.items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
})

// ─── ProductPicker modal ─────────────────────────────────────────────────────

function ProductPicker({
  products,
  selectedIds,
  onSelect,
  onClose,
}: {
  products: Product[]
  selectedIds: string[]
  onSelect: (p: Product) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const filtered = products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between border-b p-4 dark:border-gray-700">
          <h3 className="font-semibold">Select Product</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-3 border-b dark:border-gray-700">
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2 dark:border-gray-700">
            <Search size={14} className="text-gray-400" />
            <input
              autoFocus
              className="flex-1 bg-transparent text-sm outline-none"
              placeholder="Search products…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        <ul className="max-h-72 overflow-y-auto">
          {filtered.map((p) => {
            const alreadyAdded = selectedIds.includes(p.id)
            return (
              <li key={p.id}>
                <button
                  onClick={() => { onSelect(p); onClose() }}
                  disabled={alreadyAdded}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
                >
                  {p.images?.[0] ? (
                    <img src={imgUrl(p.images[0].path)} className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100 dark:bg-gray-800">
                      <Package size={16} className="text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-gray-500">₹{Number(p.price).toFixed(2)}</p>
                  </div>
                  {alreadyAdded && <span className="text-xs text-violet-500">Added</span>}
                </button>
              </li>
            )
          })}
          {!filtered.length && (
            <li className="px-4 py-6 text-center text-sm text-gray-400">No products found</li>
          )}
        </ul>
      </div>
    </div>
  )
}

// ─── ComboForm modal ─────────────────────────────────────────────────────────

function ComboForm({
  initial,
  products,
  onSubmit,
  onClose,
  saving,
}: {
  initial: FormState
  products: Product[]
  onSubmit: (payload: CreateComboPayload) => void
  onClose: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<FormState>(initial)
  const [showPicker, setShowPicker] = useState(false)

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))

  const productMap = new Map(products.map((p) => [p.id, p]))

  const addProduct = (p: Product) => {
    set({ items: [...form.items, { productId: p.id, variantId: null, quantity: 1 }] })
  }

  const removeItem = (idx: number) => {
    set({ items: form.items.filter((_, i) => i !== idx) })
  }

  const updateItem = (idx: number, patch: Partial<ComboItemPayload>) => {
    set({ items: form.items.map((item, i) => i === idx ? { ...item, ...patch } : item) })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Name is required')
    if (!form.price || Number(form.price) <= 0) return toast.error('Enter a valid price')
    if (form.items.length < 2) return toast.error('Add at least 2 products to the combo')
    onSubmit({
      name: form.name.trim(),
      slug: form.slug.trim() || toSlug(form.name.trim()),
      description: form.description.trim() || undefined,
      price: Number(form.price),
      isActive: form.isActive,
      startsAt: fromDatetimeLocal(form.startsAt),
      endsAt: fromDatetimeLocal(form.endsAt),
      items: form.items,
    })
  }

  // Auto-fill slug from name
  useEffect(() => {
    if (!initial.slug) set({ slug: toSlug(form.name) })
  }, [form.name])

  // Compute original total price
  const originalTotal = form.items.reduce((sum, item) => {
    const p = productMap.get(item.productId)
    return sum + (p ? Number(p.price) * item.quantity : 0)
  }, 0)

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto p-4">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-gray-900 my-8">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-5 dark:border-gray-700">
            <h2 className="text-lg font-bold">{initial.name ? 'Edit Combo' : 'New Combo'}</h2>
            <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800"><X size={20} /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* Basic info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Combo Name *</label>
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  value={form.name}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder="Summer Style Pack"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Slug</label>
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  value={form.slug}
                  onChange={(e) => set({ slug: e.target.value })}
                  placeholder="summer-style-pack"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Description</label>
              <textarea
                className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                rows={2}
                value={form.description}
                onChange={(e) => set({ description: e.target.value })}
                placeholder="Get the complete look at a special price"
              />
            </div>

            {/* Pricing */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Combo Price (₹) *</label>
                <div className="flex items-center gap-2 rounded-lg border px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
                  <IndianRupee size={14} className="text-gray-400" />
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    className="flex-1 bg-transparent text-sm outline-none"
                    value={form.price}
                    onChange={(e) => set({ price: e.target.value })}
                    placeholder="999"
                  />
                </div>
                {originalTotal > 0 && Number(form.price) > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    Original total: ₹{originalTotal.toFixed(2)} —{' '}
                    <span className={Number(form.price) < originalTotal ? 'text-green-600 font-medium' : 'text-red-500'}>
                      {Number(form.price) < originalTotal
                        ? `saves ₹${(originalTotal - Number(form.price)).toFixed(2)} (${Math.round((1 - Number(form.price) / originalTotal) * 100)}% off)`
                        : 'higher than original'}
                    </span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 pt-6">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={form.isActive}
                    onChange={(e) => set({ isActive: e.target.checked })}
                  />
                  <div className="h-5 w-9 rounded-full bg-gray-300 peer-checked:bg-violet-600 transition-colors" />
                  <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                </label>
                <span className="text-sm">Active</span>
              </div>
            </div>

            {/* Schedule */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Starts At</label>
                <input type="datetime-local" className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  value={form.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Ends At</label>
                <input type="datetime-local" className="w-full rounded-lg border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  value={form.endsAt} onChange={(e) => set({ endsAt: e.target.value })} />
              </div>
            </div>

            {/* Products in combo */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium">Products in Combo * (min 2)</label>
                <button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  className="flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
                >
                  <Plus size={13} /> Add Product
                </button>
              </div>

              {form.items.length === 0 ? (
                <div className="flex h-20 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-400">No products added yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {form.items.map((item, idx) => {
                    const p = productMap.get(item.productId)
                    if (!p) return null
                    const variants = (p as any).variants ?? []
                    return (
                      <div key={idx} className="flex items-center gap-3 rounded-lg border p-3 dark:border-gray-700">
                        {p.images?.[0] ? (
                          <img src={imgUrl(p.images[0].path)} className="h-10 w-10 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                            <Package size={14} className="text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">{p.name}</p>
                          <p className="text-xs text-gray-500">₹{Number(p.price).toFixed(2)}</p>
                        </div>
                        {variants.length > 0 && (
                          <select
                            className="rounded border px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
                            value={item.variantId ?? ''}
                            onChange={(e) => updateItem(idx, { variantId: e.target.value || null })}
                          >
                            <option value="">Any size</option>
                            {variants.map((v: any) => (
                              <option key={v.id} value={v.id}>{v.size}{v.color ? ` / ${v.color}` : ''}</option>
                            ))}
                          </select>
                        )}
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => updateItem(idx, { quantity: Math.max(1, item.quantity - 1) })}
                            className="flex h-6 w-6 items-center justify-center rounded border text-xs dark:border-gray-700">−</button>
                          <span className="w-6 text-center text-sm">{item.quantity}</span>
                          <button type="button" onClick={() => updateItem(idx, { quantity: item.quantity + 1 })}
                            className="flex h-6 w-6 items-center justify-center rounded border text-xs dark:border-gray-700">+</button>
                        </div>
                        <button type="button" onClick={() => removeItem(idx)}
                          className="rounded-lg p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 border-t pt-4 dark:border-gray-700">
              <button type="button" onClick={onClose}
                className="flex-1 rounded-xl border py-2.5 text-sm font-medium dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60">
                {saving ? 'Saving…' : initial.name ? 'Save Changes' : 'Create Combo'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showPicker && (
        <ProductPicker
          products={products}
          selectedIds={form.items.map((i) => i.productId)}
          onSelect={addProduct}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function Combos(): ReactElement {
  const qc = useQueryClient()
  const [formCombo, setFormCombo] = useState<Combo | null | 'new'>(null)
  const [deleteTarget, setDeleteTarget] = useState<Combo | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const { data: combos = [], isLoading } = useQuery({ queryKey: ['combos'], queryFn: listCombos })
  const { data: products = [] } = useQuery({ queryKey: ['products-all'], queryFn: () => listProducts({ limit: 200 }).then((r) => r.items) })

  const createMut = useMutation({
    mutationFn: createCombo,
    onSuccess: () => { toast.success('Combo created'); qc.invalidateQueries({ queryKey: ['combos'] }); setFormCombo(null) },
    onError: (e) => toast.error(apiErrorMessage(e)),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateComboPayload> }) => updateCombo(id, payload),
    onSuccess: () => { toast.success('Combo updated'); qc.invalidateQueries({ queryKey: ['combos'] }); setFormCombo(null) },
    onError: (e) => toast.error(apiErrorMessage(e)),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCombo(id),
    onSuccess: () => { toast.success('Combo deleted'); qc.invalidateQueries({ queryKey: ['combos'] }); setDeleteTarget(null) },
    onError: (e) => toast.error(apiErrorMessage(e)),
  })

  const toggle = (id: string) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const saving = createMut.isPending || updateMut.isPending

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Combo Products</h1>
          <p className="mt-1 text-sm text-gray-500">Merge 2–5 products into one shoppable combo at a fixed price</p>
        </div>
        <button
          onClick={() => setFormCombo('new')}
          className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700"
        >
          <Plus size={16} /> New Combo
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse dark:bg-gray-800" />)}
        </div>
      ) : combos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-20 dark:border-gray-700">
          <Package size={40} className="mb-3 text-gray-300" />
          <p className="font-medium text-gray-500">No combos yet</p>
          <p className="mt-1 text-sm text-gray-400">Create your first combo product</p>
          <button onClick={() => setFormCombo('new')} className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white">
            Create Combo
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {combos.map((combo) => {
            const isOpen = expanded.has(combo.id)
            const originalTotal = combo.items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0)
            const savings = originalTotal - Number(combo.price)
            const now = new Date()
            const active = combo.isActive &&
              (!combo.startsAt || new Date(combo.startsAt) <= now) &&
              (!combo.endsAt || new Date(combo.endsAt) >= now)

            return (
              <div key={combo.id} className="rounded-xl border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-center gap-4 p-4">
                  <button onClick={() => toggle(combo.id)} className="text-gray-400">
                    {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{combo.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                        {combo.items.length} products
                      </span>
                    </div>
                    {combo.description && <p className="mt-0.5 text-xs text-gray-500 truncate">{combo.description}</p>}
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-violet-700">₹{Number(combo.price).toFixed(2)}</p>
                    {savings > 0 && (
                      <p className="text-xs text-green-600">saves ₹{savings.toFixed(0)}</p>
                    )}
                    <p className="text-xs text-gray-400 line-through">₹{originalTotal.toFixed(2)}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setFormCombo(combo)}
                      className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(combo)}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t px-4 pb-4 pt-3 dark:border-gray-700">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {combo.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-2.5 dark:bg-gray-800">
                          {item.product.images?.[0] ? (
                            <img src={imgUrl(item.product.images[0].path)} className="h-10 w-10 rounded object-cover" />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-200 dark:bg-gray-700">
                              <Package size={14} className="text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium">{item.product.name}</p>
                            <p className="text-xs text-gray-500">
                              {item.variant ? `${item.variant.size}${item.variant.color ? ` / ${item.variant.color}` : ''}` : 'Any size'}
                              {' · '}Qty: {item.quantity}
                            </p>
                          </div>
                          <p className="text-xs font-medium text-gray-600">₹{(Number(item.product.price) * item.quantity).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-4 text-xs text-gray-400">
                      {combo.startsAt && <span>From: {new Date(combo.startsAt).toLocaleDateString()}</span>}
                      {combo.endsAt && <span>Until: {new Date(combo.endsAt).toLocaleDateString()}</span>}
                      <span>Slug: /{combo.slug}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create / Edit form */}
      {formCombo && (
        <ComboForm
          initial={formCombo === 'new' ? EMPTY : comboToForm(formCombo)}
          products={products}
          saving={saving}
          onClose={() => setFormCombo(null)}
          onSubmit={(payload) => {
            if (formCombo === 'new') {
              createMut.mutate(payload)
            } else {
              updateMut.mutate({ id: (formCombo as Combo).id, payload })
            }
          }}
        />
      )}

      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Delete Combo"
        message={`Delete combo "${deleteTarget?.name}"? This cannot be undone.`}
        onConfirm={() => { if (deleteTarget) deleteMut.mutate(deleteTarget.id) }}
        onClose={() => setDeleteTarget(null)}
        isLoading={deleteMut.isPending}
      />
    </div>
  )
}
