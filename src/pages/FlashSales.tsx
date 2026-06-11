import type { ReactElement, FormEvent } from 'react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { Plus, Pencil, Trash2, X, Zap } from 'lucide-react'
import {
  listFlashSales,
  createFlashSale,
  updateFlashSale,
  deleteFlashSale,
  type FlashSale,
} from '../services/flash-sales'

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

const SaleModal = ({
  sale,
  onClose,
}: {
  sale: Partial<FlashSale> | null
  onClose: () => void
}): ReactElement => {
  const queryClient = useQueryClient()
  const isEdit = !!sale?.id
  const [form, setForm] = useState<Partial<FlashSale>>(sale ?? emptyForm())
  const [productIdsInput, setProductIdsInput] = useState((sale?.productIds ?? []).join(', '))

  const set = <K extends keyof FlashSale>(k: K, v: FlashSale[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const saveMutation = useMutation({
    mutationFn: () => {
      const ids = productIdsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const payload = { ...form, productIds: ids }
      return isEdit ? updateFlashSale(form.id!, payload) : createFlashSale(payload)
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Flash sale updated' : 'Flash sale created')
      void queryClient.invalidateQueries({ queryKey: ['admin-flash-sales'] })
      onClose()
    },
    onError: () => toast.error('Failed to save flash sale'),
  })

  const handleSubmit = (e: FormEvent) => { e.preventDefault(); saveMutation.mutate() }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d1117] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">{isEdit ? 'Edit Flash Sale' : 'New Flash Sale'}</h2>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Title *</label>
            <input
              required
              value={form.title ?? ''}
              onChange={(e) => set('title', e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Discount Percent *</label>
            <input
              required
              type="number"
              min={1}
              max={100}
              value={form.discountPercent ?? 10}
              onChange={(e) => set('discountPercent', parseFloat(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Starts At *</label>
              <input
                required
                type="datetime-local"
                value={form.startsAt?.slice(0, 16) ?? ''}
                onChange={(e) => set('startsAt', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Ends At *</label>
              <input
                required
                type="datetime-local"
                value={form.endsAt?.slice(0, 16) ?? ''}
                onChange={(e) => set('endsAt', e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Product IDs (comma-separated)</label>
            <textarea
              rows={3}
              value={productIdsInput}
              onChange={(e) => setProductIdsInput(e.target.value)}
              placeholder="uuid1, uuid2, uuid3…"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              id="saleActive"
              type="checkbox"
              checked={form.isActive ?? true}
              onChange={(e) => set('isActive', e.target.checked)}
              className="h-4 w-4 rounded accent-indigo-600"
            />
            <label htmlFor="saleActive" className="text-sm text-slate-300">Active</label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-400 hover:bg-white/5">Cancel</button>
            <button type="submit" disabled={saveMutation.isPending} className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
              {saveMutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Sale'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const FlashSales = (): ReactElement => {
  const queryClient = useQueryClient()
  const [modal, setModal] = useState<Partial<FlashSale> | null | false>(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['admin-flash-sales'],
    queryFn: listFlashSales,
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
      {modal !== false && <SaleModal sale={modal} onClose={() => setModal(false)} />}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative rounded-2xl border border-white/10 bg-[#0d1117] p-6 shadow-2xl">
            <p className="mb-4 text-sm text-slate-200">Delete this flash sale?</p>
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
          <p className="mt-1 text-sm text-slate-400">Time-limited discount campaigns.</p>
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
          No flash sales yet.{' '}
          <button onClick={() => setModal(emptyForm())} className="text-indigo-400 hover:underline">Create one</button>
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
                <div className="text-2xl font-black text-white">{sale.discountPercent}% off</div>
                <div className="space-y-1 text-xs text-slate-500">
                  <p>From: {new Date(sale.startsAt).toLocaleString('en-IN')}</p>
                  <p>Until: {new Date(sale.endsAt).toLocaleString('en-IN')}</p>
                  {sale.productIds.length > 0 && (
                    <p>{sale.productIds.length} product{sale.productIds.length !== 1 ? 's' : ''}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModal(sale)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/10 py-1.5 text-xs text-slate-300 hover:bg-white/5"
                  >
                    <Pencil size={12} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(sale.id)}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
                  >
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
