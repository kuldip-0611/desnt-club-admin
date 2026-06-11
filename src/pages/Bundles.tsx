import type { ReactElement } from 'react'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { X } from 'lucide-react'
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
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
  } catch {
    return iso
  }
}

type FormState = {
  name: string
  description: string
  discountType: BundleDiscountType
  discountValue: string
  minItems: string
  productIds: string
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
  productIds: '',
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
  productIds: b.productIds.join(', '),
  isActive: b.isActive,
  startsAt: toDatetimeLocal(b.startsAt),
  endsAt: toDatetimeLocal(b.endsAt),
})

const formToPayload = (f: FormState): CreateBundlePayload => ({
  name: f.name.trim(),
  description: f.description.trim() || undefined,
  discountType: f.discountType,
  discountValue: Number(f.discountValue),
  minItems: f.minItems ? Number(f.minItems) : undefined,
  productIds: f.productIds
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  isActive: f.isActive,
  startsAt: fromDatetimeLocal(f.startsAt),
  endsAt: fromDatetimeLocal(f.endsAt),
})

const Bundles = (): ReactElement => {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null)
  const [bundleToDelete, setBundleToDelete] = useState<Bundle | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)

  const { data: bundles = [], isLoading } = useQuery({
    queryKey: ['admin-bundles'],
    queryFn: listBundles,
  })

  const createMutation = useMutation({
    mutationFn: createBundle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bundles'] })
      toast.success('Bundle created')
      setModalOpen(false)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Create failed'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreateBundlePayload }) =>
      updateBundle(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bundles'] })
      toast.success('Bundle saved')
      setModalOpen(false)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Save failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBundle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bundles'] })
      toast.success('Bundle deleted')
      setBundleToDelete(null)
    },
    onError: (err: Error) => toast.error(err.message ?? 'Delete failed'),
  })

  const openCreate = () => {
    setEditingBundle(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (b: Bundle) => {
    setEditingBundle(b)
    setForm(bundleToForm(b))
    setModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = formToPayload(form)
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
                      {b.description && (
                        <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{b.description}</p>
                      )}
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
                      <button
                        type="button"
                        onClick={() => openEdit(b)}
                        className="mr-3 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setBundleToDelete(b)}
                        className="text-xs font-semibold text-red-400 hover:text-red-300"
                      >
                        Delete
                      </button>
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-2xl bg-slate-900 p-6 shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-white/10"
            >
              <X size={16} />
            </button>
            <h2 className="text-lg font-bold text-white">
              {editingBundle ? 'Edit Bundle' : 'Create Bundle'}
            </h2>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Name *
                </label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="Summer Bundle"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="Buy more, save more"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Discount Type
                  </label>
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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Discount Value *
                  </label>
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

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Min Items
                </label>
                <input
                  type="number"
                  min={1}
                  value={form.minItems}
                  onChange={(e) => setField('minItems', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Product IDs
                </label>
                <input
                  value={form.productIds}
                  onChange={(e) => setField('productIds', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="uuid1, uuid2, uuid3"
                />
                <p className="mt-0.5 text-xs text-slate-500">Enter product IDs, comma-separated</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Starts At
                  </label>
                  <input
                    type="datetime-local"
                    value={form.startsAt}
                    onChange={(e) => setField('startsAt', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Ends At
                  </label>
                  <input
                    type="datetime-local"
                    value={form.endsAt}
                    onChange={(e) => setField('endsAt', e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="bundleIsActive"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setField('isActive', e.target.checked)}
                  className="h-4 w-4 rounded accent-indigo-500"
                />
                <label htmlFor="bundleIsActive" className="text-sm text-slate-300">
                  Active
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 disabled:opacity-60"
                >
                  {isPending ? 'Saving…' : editingBundle ? 'Save changes' : 'Create bundle'}
                </button>
              </div>
            </form>
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
          deleteMutation.mutate(bundleToDelete.id, {
            onSuccess: () => setBundleToDelete(null),
          })
        }}
      />
    </div>
  )
}

export default Bundles
